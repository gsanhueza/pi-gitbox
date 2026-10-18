import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { joinPaths, normalizePath, resolvePaths } from "../../src/utils/compat";

const isWindows = process.platform === "win32";

describe("normalizePath", () => {
  it("canonicalizes platform separators to forward slashes", () => {
    expect(normalizePath(join("a", "b", "c"))).toBe("a/b/c");
  });

  it("expands a leading ~ to the home directory", () => {
    expect(normalizePath("~/dev")).toBe(`${normalizePath(homedir())}/dev`);
  });
});

describe("joinPaths", () => {
  it("joins multiple segments with canonical separators", () => {
    expect(joinPaths("a", "b", "c")).toBe("a/b/c");
  });

  it("uses the first absolute base", () => {
    expect(joinPaths("/a", "/b", "/c")).toBe("/a/b/c");
  });
});

describe("resolvePaths", () => {
  it("resolves a relative path against the cwd", () => {
    const cwd = normalizePath(process.cwd());
    expect(resolvePaths(process.cwd(), "relative")).toBe(`${cwd}/relative`);
  });

  it.runIf(isWindows)(
    "resolves a relative path against a drive-absolute base",
    () => {
      expect(resolvePaths("C:\\cwd", "relative")).toBe("C:/cwd/relative");
    },
  );

  it.runIf(isWindows)(
    "keeps drive-absolute paths absolute (regression)",
    () => {
      expect(resolvePaths("C:\\Users\\test\\file.txt")).toBe(
        "C:/Users/test/file.txt",
      );
      expect(resolvePaths("C:/Users/test/file.txt")).toBe(
        "C:/Users/test/file.txt",
      );
    },
  );

  it.skipIf(isWindows)(
    "resolves relative against a POSIX absolute base",
    () => {
      expect(resolvePaths("/cwd", "relative")).toBe("/cwd/relative");
    },
  );

  it.skipIf(isWindows)("resolves multiple relative segments", () => {
    expect(resolvePaths("/base", "a", "b")).toBe("/base/a/b");
  });
});
