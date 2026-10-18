import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";

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
    .replace(/^~\//g, homedir().split(sep).join(PATH_SEP) + PATH_SEP);
};

/**
 * Joins paths in a Win32/POSIX compatible way
 *
 * Uses the platform-aware `join` (correct drive-letter handling on
 * Windows) and canonicalizes the result to forward slashes.
 *
 * @param paths Paths to join/merge
 * @returns A merged path
 */
export const joinPaths = (...paths: string[]): string => {
  return normalizePath(join(...paths));
};

/**
 * Resolves paths in a Win32/POSIX compatible way
 *
 * Uses the platform-aware `resolve` (correct drive-letter handling on
 * Windows) and canonicalizes the result to forward slashes.
 *
 * @param paths Paths to resolve
 * @returns A resolved path
 */
export const resolvePaths = (...paths: string[]): string => {
  return normalizePath(resolve(...paths));
};
