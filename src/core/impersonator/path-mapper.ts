import { relative } from "node:path";

/**
 * Holds the mappings between original absolute paths and their impersonated
 * counterparts, for both files and directories.
 */
export class PathMapper {
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
   * Empties both mappers
   */
  reset(): void {
    this.fileMapper = {};
    this.dirMapper = {};
  }

  /**
   * Registers an impersonated file
   *
   * @param absSource Absolute path of the original file
   * @param target Absolute path of the impersonated file
   */
  setFile(absSource: string, target: string): void {
    this.fileMapper[absSource] = target;
  }

  /**
   * Registers an impersonated directory
   *
   * @param absSource Absolute path of the original directory
   * @param target Absolute path of the impersonated directory
   */
  setDir(absSource: string, target: string): void {
    this.dirMapper[absSource] = target;
  }

  /**
   * Looks up the impersonated path for a file
   *
   * @param absSource Absolute path of the original file
   * @returns The impersonated path, if registered
   */
  getFile(absSource: string): string | undefined {
    return this.fileMapper[absSource];
  }

  /**
   * Looks up the impersonated path for a directory
   *
   * @param absSource Absolute path of the original directory
   * @returns The impersonated path, if registered
   */
  getDir(absSource: string): string | undefined {
    return this.dirMapper[absSource];
  }

  /**
   * Builds a mapper with sources relative to the given base directory.
   *
   * @param mapper The absolute source -> target mapping
   * @param baseDir The base directory to resolve relative paths against
   * @returns The source -> target path mapping with relative sources
   */
  private relativize(
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
  getFiles(baseDir: string): Record<string, string> {
    return this.relativize(this.fileMapper, baseDir);
  }

  /**
   * Returns the directory mapper, with sources relative to the given base directory.
   *
   * @param baseDir The base directory to resolve relative paths against
   * @returns The source -> target path mapping for directories
   */
  getDirs(baseDir: string): Record<string, string> {
    return this.relativize(this.dirMapper, baseDir);
  }
}
