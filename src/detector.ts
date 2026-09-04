import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { execSync } from "child_process";
import { statSync } from "fs";
import { lstat } from "fs/promises";
import { normalizePath, PATH_SEP, resolvePaths } from "./compat";

export const Detector = new (class {
  /**
   * Determines if the user has `git` as a usable command
   *
   * @returns True if git exists
   */
  isGitAvailable(): boolean {
    try {
      execSync("git -v", { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Determines if the current working directory is a git repository
   * @returns True if it's a git repo
   */
  isGitProject(): boolean {
    try {
      execSync("git rev-parse --is-inside-work-tree", { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns all gitignored files
   *
   * @returns Relative paths for files
   */
  getGitignoredFiles = () => {
    const paths = this.getGitignoredPaths();
    return paths.filter((path) => !this.isDirectory(path));
  };

  /**
   * Returns all gitignored directories
   *
   * @returns Relative paths for directories
   */
  getGitignoredDirectories = () => {
    const paths = this.getGitignoredPaths();
    return paths.filter(this.isDirectory);
  };

  /**
   * Runs the git command to get all git-ignored paths (both files and directories).
   * Returns an array of paths that are ignored by git.
   *
   * @returns Array of git-ignored paths (relative to repo root)
   */
  getGitignoredPaths(): string[] {
    try {
      const command =
        "git ls-files --directory --no-empty-directory --others --ignored --exclude-standard";
      const output = execSync(command, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      const lines = output
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);
      return lines;
    } catch (error) {
      // Silently ignore if not a git repository
      return [];
    }
  }

  /**
   * Checks if a path exists on disk.
   * Uses lstat so dangling symlinks count as real.
   * Only genuine "missing" errors (ENOENT, ENOTDIR) return false;
   * everything else (EACCES, EPERM, …) counts as existing (security-first).
   *
   * @param path The path to check
   * @param cwd Working directory to resolve relative paths against
   * @returns True if path exists (or might exist due to permission errors)
   */
  async pathExists(
    path: string,
    cwd: string = process.cwd(),
  ): Promise<boolean> {
    if (!path) return false;
    try {
      await lstat(resolvePaths(cwd, normalizePath(path)));
      return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code ?? "";
      // Only genuine "missing" errors mean the path doesn't exist.
      // EACCES/EPERM/ELOOP/… => treat as existing (security-first).
      return code !== "ENOENT" && code !== "ENOTDIR";
    }
  }

  /**
   * Checks if a path is contained within any of the allowed directories.
   * The check is recursive: if `/a` is allowed, then `/a/b/c` also passes.
   *
   * @param dirs Allowed directories
   * @param path The path to check (will be resolved relative to cwd)
   * @param ctx The extension context
   * @returns True if the path is within at least one allowed directory
   */
  isPathAllowed(dirs: string[], path: string, ctx: ExtensionContext): boolean {
    // Expand ~ to home directory before resolving
    const normalizedPath = normalizePath(path);
    const absPath = resolvePaths(ctx.cwd, normalizedPath);
    const absDirs = dirs.map((dir) =>
      resolvePaths(ctx.cwd, normalizePath(dir)),
    );

    const response = absDirs.some(
      (dir) => absPath === dir || absPath.startsWith(dir + PATH_SEP),
    );

    return response;
  }

  /**
   * Dynamically checks if a path is gitignored
   *
   * E.g.: If the `.gitignore` is
   *
   * ```
   * .vscode/*
   * !.vscode/launch.json
   * ```
   *
   * Then,
   * .vscode/launch.json should be preserved
   * .vscode/tasks.json should be gitignored
   *
   * @param path The path to check
   * @returns True if it should be gitignored
   */
  dynamicCheck(path: string): boolean {
    try {
      const command = `git check-ignore ${path}`;
      execSync(command, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a path is a directory.
   *
   * @param path The path to check (will be resolved relative to cwd)
   * @returns True if the path is a directory
   */
  isDirectory(path: string): boolean {
    try {
      const absPath = resolvePaths(path);
      return statSync(absPath).isDirectory();
    } catch {
      return false;
    }
  }
})();
