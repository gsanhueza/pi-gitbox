import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { basename } from "node:path";
import { relative } from "node:path";
import { joinPaths, resolvePaths } from "../../utils/compat";
import { Detector } from "../detector";
import { Settings } from "../../settings";
import { CommandPathExtractor } from "./command-path-extractor";
import { ImpersonationFactory } from "./impersonation-factory";
import { PathMapper } from "./path-mapper";

/**
 * Facade orchestrating the impersonation of git-ignored paths.
 *
 * Delegates mapping to {@link PathMapper}, creation of impersonated artifacts
 * to {@link ImpersonationFactory}, and shell parsing to {@link CommandPathExtractor}.
 */
export class Impersonator {
  private readonly detector: Detector;
  private readonly mapper = new PathMapper();
  private readonly factory: ImpersonationFactory;
  private readonly extractor = new CommandPathExtractor();

  /**
   * @param detector Detector used for gitignore and path queries
   * @param settings Settings providing the Gitbox configuration
   */
  constructor(
    detector: Detector,
    private readonly settings: Settings,
  ) {
    this.detector = detector;
    this.factory = new ImpersonationFactory(detector);
  }

  /**
   * Returns a combined mapper of both file and directory impersonations
   * @returns Combined source -> target path mapping
   */
  get pathMapper(): Record<string, string> {
    return this.mapper.pathMapper;
  }

  /**
   * Fills the mapper with paths that are gitignored
   *
   * @param ctx The context containing cwd
   */
  async initialize(ctx: ExtensionContext): Promise<void> {
    this.mapper.reset();
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
      const impersonation = await this.factory.createDirectory(
        path,
        projectDir,
      );
      const absPath = resolvePaths(cwd, path);

      this.mapper.setDir(absPath, impersonation);
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
      const impersonation = await this.factory.createFile(path, projectDir);
      const absPath = resolvePaths(cwd, path);

      this.mapper.setFile(absPath, impersonation);
    }
  }

  /**
   * Returns the file mapper, with sources relative to the given base directory.
   *
   * @param baseDir The base directory to resolve relative paths against
   * @returns The source -> target path mapping for files
   */
  getFileMapper(baseDir: string): Record<string, string> {
    return this.mapper.getFiles(baseDir);
  }

  /**
   * Returns the directory mapper, with sources relative to the given base directory.
   *
   * @param baseDir The base directory to resolve relative paths against
   * @returns The source -> target path mapping for directories
   */
  getDirMapper(baseDir: string): Record<string, string> {
    return this.mapper.getDirs(baseDir);
  }

  /**
   * Impersonates the bash command, if possible
   *
   * @param cmd The bash command whose paths will be impersonated
   * @param cwd The current working directory
   * @returns The command with impersonated paths
   */
  async resolveCommand(cmd: string, cwd: string): Promise<string> {
    const paths = this.extractor.extract(cmd);

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
    const file = this.mapper.getFile(absPath);
    if (file) return file;

    // Check directory mapper only if impersonateDirs is enabled
    const { config } = await this.settings.getConfig();
    if (!config.impersonateDirs) return path;

    // Check existence in dir mapper
    const dir = this.mapper.getDir(absPath);
    if (dir) return dir;

    // Not yet in the mapper => Dynamic checking
    // We'll need to create the path on-the-fly
    if (this.detector.dynamicCheck(absPath, cwd)) {
      const relPath = relative(cwd, path);
      const projectDir = joinPaths(config.baseDir, basename(cwd));

      if (this.detector.isDirectory(absPath)) {
        // E.g.: `.vscode/myfolder/` when only `.vscode/` is gitignored)
        const impersonation = await this.factory.createDirectory(
          relPath,
          projectDir,
        );
        this.mapper.setDir(absPath, impersonation);
        return impersonation;
      } else {
        // E.g.: `.vscode/launch.json` when only `.vscode/` is gitignored)
        const impersonation = await this.factory.createFile(
          relPath,
          projectDir,
        );
        this.mapper.setFile(absPath, impersonation);
        return impersonation;
      }
    }

    // Couldn't find anything to impersonate, return the original path
    return path;
  }

  /**
   * Extracts potential file paths from a bash command string.
   *
   * @param command The bash command string to parse
   * @returns Array of path arguments found in the command
   */
  extractFromCommand(command: string): string[] {
    return this.extractor.extract(command);
  }
}
