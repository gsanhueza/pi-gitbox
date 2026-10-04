import { homedir } from "node:os";
import { posix, resolve, sep } from "node:path";

/**
 * Standardized path separator
 */
export const PATH_SEP = "/";

/**
 * Standardizes the path, even if represents the home directory
 *
 * @param path The path to normalize
 * @returns A normalized path
 */
export const normalizePath = (path: string): string => {
  return path
    .split(sep)
    .join(PATH_SEP)
    .replace(/^~\//g, homedir() + PATH_SEP);
};

/**
 * Joins paths in a Win32/POSIX compatible way
 *
 * @param paths Paths to join/merge
 * @returns A merged path
 */
export const joinPaths = (...paths: string[]): string => {
  const merged = posix.join(...paths);
  const response = normalizePath(merged);

  return response;
};

/**
 * Resolves paths in a Win32/POSIX compatible way
 *
 * @param paths Paths to resolve
 * @returns A resolved path
 */
export const resolvePaths = (...paths: string[]): string => {
  const resolved = resolve(...paths);
  const response = normalizePath(resolved);

  return response;
};
