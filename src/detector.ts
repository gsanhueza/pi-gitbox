import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { execSync } from "child_process";
import { access, stat } from "fs/promises";
import { homedir } from "node:os";
import { resolve, sep } from "node:path";

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

    return paths.filter((path) => !path.endsWith("/"));
  };

  /**
   * Returns all gitignored directories
   *
   * @returns Relative paths for directories
   */
  getGitignoredDirectories = () => {
    const paths = this.getGitignoredPaths();

    return paths.filter((path) => path.endsWith("/"));
  };

  /**
   * Runs the git command to get all git-ignored paths (both files and directories).
   * Returns an array of paths that are ignored by git.
   *
   * @returns Array of git-ignored paths (relative to repo root)
   */
  private getGitignoredPaths(): string[] {
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
   * Checks if a path exists
   *
   * @param path The path to check
   * @returns True if path exists
   */
  async pathExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
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
    const normalizedPath = this.normalizePath(path);
    const absPath = resolve(ctx.cwd, normalizedPath);
    const absDirs = dirs.map((dir) =>
      resolve(ctx.cwd, this.normalizePath(dir)),
    );

    return absDirs.some(
      (dir) => absPath === dir || absPath.startsWith(dir + sep),
    );
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
   * First checks if the path exists on disk using fs.stat.
   * If it doesn't exist, falls back to checking for a trailing slash.
   *
   * @param path The path to check (will be resolved relative to cwd)
   * @returns True if the path is a directory
   */
  async isDirectory(path: string): Promise<boolean> {
    try {
      const absPath = resolve(path);
      const stats = await stat(absPath);
      return stats.isDirectory();
    } catch {
      // Path doesn't exist on disk, check for trailing slash
      return path.endsWith("/") || path.endsWith(sep);
    }
  }

  /**
   * Normalizes the path when it comes with a tilde (representing HOME)
   * @param path The path
   * @returns A normalized path
   */
  private normalizePath(path: string): string {
    return path.replace(/^~\//g, homedir() + sep);
  }
})();
