import { execSync } from "child_process";
import { statSync } from "fs";
import { lstat } from "fs/promises";
import { normalizePath, PATH_SEP, resolvePaths } from "../utils/compat";

/**
 * Minimal execSync signature for git commands.
 */
type ExecSyncFn = typeof execSync;

/**
 * Detects environment capabilities for git operations.
 *
 * Uses an injectable `execSync` function to allow mocking in tests.
 *
 * @example
 * ```typescript
 * // Production
 * import { execSync } from "child_process";
 * const detector = new Detector(execSync);
 *
 * // Tests
 * const mockExec = vi.fn();
 * const detector = new Detector(mockExec);
 * ```
 */
export class Detector {
  constructor(private readonly execFn: ExecSyncFn = execSync) {}

  /**
   * Unified git command options: returns a string and suppresses stderr.
   */
  private readonly gitOptions: Parameters<ExecSyncFn>[1] = {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "ignore"],
  };

  /**
   * Executes a git command and returns its stdout. Throws on failure.
   *
   * @param command The git command to execute
   * @param cwd Working directory for the git command
   * @returns Command stdout as a string
   */
  private runGitCommand(command: string, cwd: string): string {
    return String(this.execFn(command, { ...this.gitOptions, cwd }));
  }

  /**
   * Determines if the user has `git` as a usable command.
   *
   * @param cwd The directory to run git commands in
   * @returns True if git exists
   */
  isGitAvailable(cwd: string): boolean {
    try {
      this.runGitCommand("git -v", cwd);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Determines if the given directory is a git repository.
   *
   * @param cwd The directory to check
   * @returns True if it's a git repo
   */
  isGitProject(cwd: string): boolean {
    try {
      this.runGitCommand("git rev-parse --is-inside-work-tree", cwd);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns all gitignored files.
   *
   * @param cwd The directory to run git commands in
   * @returns Relative paths for files
   */
  getGitignoredFiles(cwd: string): string[] {
    const paths = this.getGitignoredPaths(cwd);
    return paths.filter((path) => !this.isDirectory(path));
  }

  /**
   * Returns all gitignored directories.
   *
   * @param cwd The directory to run git commands in
   * @returns Relative paths for directories
   */
  getGitignoredDirectories(cwd: string): string[] {
    const paths = this.getGitignoredPaths(cwd);
    return paths.filter(this.isDirectory);
  }

  /**
   * Runs the git command to get all git-ignored paths (both files and directories).
   * Returns an array of paths that are ignored by git.
   *
   * @param cwd The directory to run git commands in
   * @returns Array of git-ignored paths (relative to repo root)
   */
  getGitignoredPaths(cwd: string): string[] {
    try {
      const output = this.runGitCommand(
        "git ls-files --directory --no-empty-directory --others --ignored --exclude-standard",
        cwd,
      );
      const lines = output
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);
      return lines;
    } catch {
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
  isPathAllowed(dirs: string[], path: string, cwd: string): boolean {
    // Expand ~ to home directory before resolving
    const normalizedPath = normalizePath(path);
    const absPath = resolvePaths(cwd, normalizedPath);
    const absDirs = dirs.map((dir) => resolvePaths(cwd, normalizePath(dir)));

    const response = absDirs.some(
      (dir) => absPath === dir || absPath.startsWith(dir + PATH_SEP),
    );

    return response;
  }

  /**
   * Dynamically checks if a path is gitignored.
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
   * @param cwd The directory to run git commands in
   * @returns True if it should be gitignored
   */
  dynamicCheck(path: string, cwd: string): boolean {
    try {
      this.runGitCommand(`git check-ignore ${path}`, cwd);
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
}
