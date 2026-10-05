import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative } from "node:path";
import type { GlobPattern } from "shell-quote";
import { parse } from "shell-quote";
import { joinPaths, resolvePaths } from "../utils/compat";
import { Detector } from "./detector";
import { Settings } from "../settings";

export class Impersonator {
  constructor(
    private readonly detector: Detector,
    private readonly settings: Settings,
  ) {}

  private fileMapper: Record<string, string> = {};
  private dirMapper: Record<string, string> = {};

  /**
   * Returns a combined mapper of both file and directory impersonations
   * @returns Combined source -> target path mapping
   */
  get pathMapper(): Record<string, string> {
    return { ...this.fileMapper, ...this.dirMapper };
  }

  /**
   * Fills the mapper with paths that are gitignored
   *
   * @param ctx The context containing cwd
   */
  async initialize(ctx: ExtensionContext): Promise<void> {
    this.fileMapper = {};
    this.dirMapper = {};
    const { config } = await this.settings.getConfig();

    await this.initializeFiles(config.baseDir, ctx.cwd);

    if (config.impersonateDirs) {
      await this.initializeDirectories(config.baseDir, ctx.cwd);
    }
  }

  /**
   * Initializes the mapper for directories
   *
   * @param baseDir Gitbox basedir
   * @param cwd The current working directory
   */
  private async initializeDirectories(baseDir: string, cwd: string) {
    const gitignoredDirectories = this.detector.getGitignoredDirectories(cwd);
    const projectDir = joinPaths(baseDir, basename(cwd));

    for (const path of gitignoredDirectories) {
      const impersonation = await this.createDirectory(path, projectDir);
      const absPath = resolvePaths(cwd, path);

      this.dirMapper[absPath] = impersonation;
    }
  }

  /**
   * Initializes the mapper for files
   *
   * @param baseDir Gitbox basedir
   * @param cwd The current working directory
   */
  private async initializeFiles(baseDir: string, cwd: string) {
    const gitignoredFiles = this.detector.getGitignoredFiles(cwd);
    const projectDir = joinPaths(baseDir, basename(cwd));

    for (const path of gitignoredFiles) {
      const impersonation = await this.createFile(path, projectDir);
      const absPath = resolvePaths(cwd, path);

      this.fileMapper[absPath] = impersonation;
    }
  }

  /**
   * Creates an impersonated directory for a git-ignored path.
   *
   * @param relativePath The original path
   * @param parentDir The parent path to use with relativePath
   * @returns Absolute path to impersonated directory
   */
  private async createDirectory(
    relativePath: string,
    parentDir: string,
  ): Promise<string> {
    // Setup the gitbox for the project
    const impersonatingPath = resolvePaths(parentDir, relativePath);

    // Create directory if it doesn't exist
    if (!(await this.detector.pathExists(impersonatingPath))) {
      try {
        await mkdir(impersonatingPath, { recursive: true });
      } catch {
        return relativePath;
      }
    }

    return impersonatingPath;
  }

  /**
   * Creates an impersonated file for a git-ignored path.
   *
   * @param relativePath The original path
   * @param parentDir The parent path to use with relativePath
   * @returns Absolute path to impersonated file
   */
  private async createFile(
    relativePath: string,
    parentDir: string,
  ): Promise<string> {
    // Create the impersonated file
    const content = relativePath.endsWith(".json") ? "{}" : " ";

    // Setup the gitbox for the project
    const impersonatingPath = resolvePaths(parentDir, relativePath);

    // Create file if it doesn't exist
    if (!(await this.detector.pathExists(impersonatingPath))) {
      try {
        // Ensure parent directories exist first
        const fileParentDir = resolvePaths(dirname(impersonatingPath));
        await mkdir(fileParentDir, { recursive: true });

        await writeFile(impersonatingPath, content);
      } catch {
        return relativePath;
      }
    }

    return impersonatingPath;
  }

  /**
   * Builds a mapper with sources relative to the given base directory.
   *
   * @param mapper The absolute source -> target mapping
   * @param baseDir The base directory to resolve relative paths against
   * @returns The source -> target path mapping with relative sources
   */
  private buildMapper(
    mapper: Record<string, string>,
    baseDir: string,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [absSource, target] of Object.entries(mapper)) {
      result[relative(baseDir, absSource)] = target;
    }
    return result;
  }

  /**
   * Returns the file mapper, with sources relative to the given base directory.
   *
   * @param baseDir The base directory to resolve relative paths against
   * @returns The source -> target path mapping for files
   */
  getFileMapper(baseDir: string): Record<string, string> {
    return this.buildMapper(this.fileMapper, baseDir);
  }

  /**
   * Returns the directory mapper, with sources relative to the given base directory.
   *
   * @param baseDir The base directory to resolve relative paths against
   * @returns The source -> target path mapping for directories
   */
  getDirMapper(baseDir: string): Record<string, string> {
    return this.buildMapper(this.dirMapper, baseDir);
  }

  /**
   * Impersonates the bash command, if possible
   *
   * @param cmd The bash command whose paths will be impersonated
   * @param cwd The current working directory
   * @returns The command with impersonated paths
   */
  async resolveCommand(cmd: string, cwd: string): Promise<string> {
    const paths = await this.extractFromCommand(cmd);

    let response = cmd;
    for (const path of paths) {
      const impersonation = await this.resolvePath(path, cwd);
      response = response.replace(path, impersonation);
    }

    return response;
  }

  /**
   * Impersonates the path, if possible
   *
   * @param path The path to be impersonated
   * @param cwd The current working directory
   * @returns The impersonated path, if available
   */
  async resolvePath(path: string, cwd: string): Promise<string> {
    const absPath = resolvePaths(cwd, path);

    // Check file mapper first
    if (this.fileMapper[absPath]) return this.fileMapper[absPath];

    // Check directory mapper only if impersonateDirs is enabled
    const { config } = await this.settings.getConfig();
    if (!config.impersonateDirs) return path;

    // Check existence in dirMapper
    if (this.dirMapper[absPath]) return this.dirMapper[absPath];

    // Not yet in the mapper => Dynamic checking
    // We'll need to create the path on-the-fly
    if (this.detector.dynamicCheck(absPath, cwd)) {
      const relPath = relative(cwd, path);
      const projectDir = joinPaths(config.baseDir, basename(cwd));

      if (this.detector.isDirectory(absPath)) {
        // E.g.: `.vscode/myfolder/` when only `.vscode/` is gitignored)
        this.dirMapper[absPath] = await this.createDirectory(
          relPath,
          projectDir,
        );
        return this.dirMapper[absPath];
      } else {
        // E.g.: `.vscode/launch.json` when only `.vscode/` is gitignored)
        this.fileMapper[absPath] = await this.createFile(relPath, projectDir);
        return this.fileMapper[absPath];
      }
    }

    // Couldn't find anything to impersonate, return the original path
    return path;
  }

  /**
   * Extracts potential file paths from a bash command string.
   *
   * @param command - The bash command string to parse
   * @returns Array of path arguments found in the command
   */
  async extractFromCommand(command: string): Promise<string[]> {
    // Tokenize the command using shell-quote
    const tokens = parse(command);

    // Collect non-operator tokens that are non-empty strings
    const paths = tokens.filter(
      (token): token is string => typeof token === "string" && token !== "",
    );

    // Collect paths from glob tokens
    // e.g.: `file dist/*` → extracts 'dist' from the glob token
    const globPaths = tokens
      .filter(
        (token): token is GlobPattern =>
          typeof token === "object" &&
          token !== null &&
          "op" in token &&
          token.op === "glob",
      )
      .map((token) => this.stripGlobPattern(token.pattern))
      .filter((p) => p !== "");

    return [...paths, ...globPaths];
  }

  /**
   * Strips a simple glob pattern (`*`) from a path, returning the base path.
   *
   * e.g.: `dist/*` → `dist`, `*` → ``, `src/file.ts` → `src/file.ts`
   *
   * @param value The glob pattern value from shell-quote
   * @returns The path with the glob suffix removed, or the original if no glob
   */
  private stripGlobPattern(value: string): string {
    const starIndex = value.indexOf("*");
    if (starIndex === -1) return value;

    // Strip from the last `/` before the `*` to the end
    const lastSlash = value.lastIndexOf("/", starIndex);
    return lastSlash === -1 ? "" : value.substring(0, lastSlash);
  }
}
