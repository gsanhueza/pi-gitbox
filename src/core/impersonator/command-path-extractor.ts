import type { GlobPattern } from "shell-quote";
import { parse } from "shell-quote";

/**
 * Extracts potential file paths from a bash command string.
 */
export class CommandPathExtractor {
  /**
   * Extracts potential file paths from a bash command string.
   *
   * @param command The bash command string to parse
   * @returns Array of path arguments found in the command
   */
  extract(command: string): string[] {
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
