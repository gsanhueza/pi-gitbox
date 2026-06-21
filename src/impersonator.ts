import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { parse } from "shell-quote";
import { Detector } from "./detector";
import { settings } from "./settings";

export class Impersonator {
  private mapper: Record<string, string> = {};

  /**
   * Fills the mapper with paths that are gitignored
   *
   * @param ctx The extension context
   */
  async initialize(ctx: ExtensionContext): Promise<void> {
    this.mapper = {};
    const { config } = await settings.getConfig();

    await this.initializeDirectories(config.baseDir, ctx);
    await this.initializeFiles(config.baseDir, ctx);
  }

  /**
   * Initializes the mapper for directories
   *
   * @param baseDir Gitbox basedir
   * @param ctx The extension context
   */
  private async initializeDirectories(baseDir: string, ctx: ExtensionContext) {
    const gitignoredDirectories = Detector.getGitignoredDirectories();
    const projectDir = join(baseDir, basename(ctx.cwd));

    for (const path of gitignoredDirectories) {
      const impersonation = await this.createDirectory(path, projectDir, ctx);
      const absPath = resolve(ctx.cwd, path);

      if (impersonation) {
        this.mapper[absPath] = impersonation;
      }
    }
  }

  /**
   * Initializes the mapper for files
   *
   * @param baseDir Gitbox basedir
   * @param ctx The extension context
   */
  private async initializeFiles(baseDir: string, ctx: ExtensionContext) {
    const gitignoredFiles = Detector.getGitignoredFiles();
    const projectDir = join(baseDir, basename(ctx.cwd));

    for (const path of gitignoredFiles) {
      const impersonation = await this.createFile(path, projectDir, ctx);
      const absPath = resolve(ctx.cwd, path);

      if (impersonation) {
        this.mapper[absPath] = impersonation;
      }
    }
  }

  /**
   * Creates an impersonated directory for a git-ignored path.
   *
   * @param relativePath The original path
   * @param parentDir The parent path to use with relativePath
   * @param ctx The extension context
   * @returns Absolute path to impersonated directory
   */
  private async createDirectory(
    relativePath: string,
    parentDir: string,
    ctx: ExtensionContext,
  ): Promise<string> {
    // Setup the gitbox for the project
    const impersonatingPath = resolve(parentDir, relativePath);

    // Create directory if it doesn't exist
    if (!(await Detector.pathExists(impersonatingPath))) {
      try {
        await mkdir(impersonatingPath, { recursive: true });
      } catch (error) {
        ctx.ui.notify(
          `Failed to create impersonated directory: ${error}`,
          "error",
        );
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
   * @param ctx The extension context
   * @returns Absolute path to impersonated file
   */
  private async createFile(
    relativePath: string,
    parentDir: string,
    ctx: ExtensionContext,
  ): Promise<string> {
    // Create the impersonated file
    const content = relativePath.endsWith(".json") ? "{}" : " ";

    // Setup the gitbox for the project
    const impersonatingPath = resolve(parentDir, relativePath);

    // Create file if it doesn't exist
    if (!(await Detector.pathExists(impersonatingPath))) {
      try {
        // Ensure parent directories exist first
        const parentDir = resolve(dirname(impersonatingPath));
        await mkdir(parentDir, { recursive: true });

        await writeFile(impersonatingPath, content);
      } catch (error) {
        ctx.ui.notify(`Failed to create impersonated file: ${error}`, "error");
        return relativePath;
      }
    }

    return impersonatingPath;
  }

  /**
   * Returns a copy of the current mapper of impersonated paths.
   * Sources are relative paths from the base directory to the original file/directory.
   *
   * @param baseDir The base directory to resolve relative paths against
   * @returns The source -> target path mapping
   */
  getMapper(baseDir: string): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [absSource, target] of Object.entries(this.mapper)) {
      result[relative(baseDir, absSource)] = target;
    }

    return result;
  }

  /**
   * Impersonates the bash command, if possible
   *
   * @param cmd The bash command whose paths will be impersonated
   * @param ctx The extension context
   * @returns The command with impersonated paths
   */
  async resolveCommand(cmd: string, ctx: ExtensionContext): Promise<string> {
    const paths = await this.extractFromCommand(cmd);

    let response = cmd;
    for (const path of paths) {
      const impersonation = await this.resolvePath(path, ctx);
      response = response.replace(path, impersonation);
    }

    return response;
  }

  /**
   * Impersonates the path, if possible
   *
   * @param path The path to be impersonated
   * @param ctx The extension context
   * @returns The impersonated path, if available
   */
  async resolvePath(path: string, ctx: ExtensionContext): Promise<string> {
    // Path could be a file/dir
    const absPath = resolve(ctx.cwd, path);
    if (this.mapper[absPath]) return this.mapper[absPath];

    // Dynamic checking => Not yet in the mapper
    // We'll need to create the path on-the-fly
    if (Detector.dynamicCheck(absPath)) {
      const { config } = await settings.getConfig();

      const relPath = relative(ctx.cwd, path);
      const projectDir = join(config.baseDir, basename(ctx.cwd));

      if (await Detector.isDirectory(relPath)) {
        // E.g.: `.vscode/myfolder/` when only `.vscode/` is gitignored)
        this.mapper[absPath] = await this.createDirectory(
          relPath,
          projectDir,
          ctx,
        );
      } else {
        // E.g.: `.vscode/launch.json` when only `.vscode/` is gitignored)
        this.mapper[absPath] = await this.createFile(relPath, projectDir, ctx);
      }

      return this.mapper[absPath];
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

    // Collect tokens that are not operators or globs - these could be paths
    const paths = tokens
      .filter((token) => typeof token === "string")
      .filter(this.isPathLike);

    return paths;
  }

  /**
   * Detects if a string is a possible path (heuristic approach)
   *
   * Takes a cautious approach, only rejecting candidates that are
   * impossible to be paths.
   *
   * @param candidate Candidate path to check
   * @returns True if it looks like a path
   */
  private isPathLike(candidate: string): boolean {
    // Empty strings
    if (!candidate) return false;

    // Command flags and options
    if (candidate.startsWith("-")) return false;

    // Pure numbers (e.g., 42, 3.14, -0)
    if (/^-?\d+(\.\d+)?$/.test(candidate)) return false;

    // URLs (e.g., https://example.com, ftp://...)
    if (/^[a-z]+:\/\//i.test(candidate)) return false;

    // Environment variable assignments (e.g., NODE_ENV=production)
    if (/^[A-Z_]+=/.test(candidate)) return false;

    // Shell reserved words and syntax keywords that can never be file paths.
    const shellReservedWords = new Set([
      "then",
      "else",
      "fi",
      "do",
      "done",
      "esac",
      "endif",
      "end",
      "true",
      "false",
    ]);
    if (shellReservedWords.has(candidate)) return false;

    // Default: assume it's path-like (prefer false positives)
    return true;
  }
}
