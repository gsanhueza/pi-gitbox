import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolvePaths } from "../../utils/compat";
import { Detector } from "../detector";

/**
 * Creates impersonated files and directories for git-ignored paths.
 */
export class ImpersonationFactory {
  /**
   * @param detector Detector used to check for path existence
   */
  constructor(private readonly detector: Detector) {}

  /**
   * Creates an impersonated directory for a git-ignored path.
   *
   * @param relativePath The original path
   * @param parentDir The parent path to use with relativePath
   * @returns Absolute path to impersonated directory
   */
  async createDirectory(
    relativePath: string,
    parentDir: string,
  ): Promise<string> {
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
  async createFile(relativePath: string, parentDir: string): Promise<string> {
    // Create the impersonated file
    const content = relativePath.endsWith(".json") ? "{}" : " ";

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
}
