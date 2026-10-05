import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Detector } from "../src/core/detector";

describe("Detector.execSync methods", () => {
  it("isGitAvailable returns true when execSync succeeds", () => {
    const mockExec = vi.fn().mockReturnValue("git version 2.40.0");
    const detector = new Detector(mockExec);
    expect(detector.isGitAvailable("/project")).toBe(true);
    expect(mockExec).toHaveBeenCalledWith("git -v", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
      cwd: "/project",
    });
  });

  it("isGitAvailable returns false when execSync throws", () => {
    const mockExec = vi.fn().mockImplementation(() => {
      throw new Error("command not found");
    });
    const detector = new Detector(mockExec);
    expect(detector.isGitAvailable("/project")).toBe(false);
  });

  it("isGitProject returns true when execSync succeeds", () => {
    const mockExec = vi.fn().mockReturnValue("true");
    const detector = new Detector(mockExec);
    expect(detector.isGitProject("/project")).toBe(true);
    expect(mockExec).toHaveBeenCalledWith(
      "git rev-parse --is-inside-work-tree",
      { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"], cwd: "/project" },
    );
  });

  it("isGitProject returns false when execSync throws", () => {
    const mockExec = vi.fn().mockImplementation(() => {
      throw new Error("not a git repo");
    });
    const detector = new Detector(mockExec);
    expect(detector.isGitProject("/project")).toBe(false);
  });

  it("getGitignoredPaths returns parsed lines on success", () => {
    const mockExec = vi.fn().mockReturnValue("node_modules\nbuild\n");
    const detector = new Detector(mockExec);
    expect(detector.getGitignoredPaths("/project")).toEqual([
      "node_modules",
      "build",
    ]);
  });

  it("getGitignoredPaths returns empty array when execSync throws", () => {
    const mockExec = vi.fn().mockImplementation(() => {
      throw new Error("not a git repo");
    });
    const detector = new Detector(mockExec);
    expect(detector.getGitignoredPaths("/project")).toEqual([]);
  });

  it("dynamicCheck returns true when execSync succeeds", () => {
    const mockExec = vi.fn();
    const detector = new Detector(mockExec);
    expect(detector.dynamicCheck("src/file.ts", "/project")).toBe(true);
    expect(mockExec).toHaveBeenCalledWith("git check-ignore src/file.ts", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
      cwd: "/project",
    });
  });

  it("dynamicCheck returns false when execSync throws", () => {
    const mockExec = vi.fn().mockImplementation(() => {
      throw new Error("not ignored");
    });
    const detector = new Detector(mockExec);
    expect(detector.dynamicCheck("src/file.ts", "/project")).toBe(false);
  });
});

describe("Detector.pathExists", () => {
  let testDir: string;
  let detector: Detector;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "detector-test-"));
    detector = new Detector();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("returns true for an existing file", async () => {
    const filePath = join(testDir, "file.txt");
    writeFileSync(filePath, "hello");
    expect(await detector.pathExists(filePath)).toBe(true);
  });

  it("returns true for an existing directory", async () => {
    const dirPath = join(testDir, "subdir");
    mkdirSync(dirPath);
    expect(await detector.pathExists(dirPath)).toBe(true);
  });

  it("returns false for a missing path", async () => {
    const missing = join(testDir, "nonexistent.txt");
    expect(await detector.pathExists(missing)).toBe(false);
  });

  it("returns false when parent is not a directory (ENOTDIR)", async () => {
    const filePath = join(testDir, "file.txt");
    writeFileSync(filePath, "hello");
    // Trying to access a path *inside* a file → ENOTDIR
    const notDir = join(filePath, "child");
    expect(await detector.pathExists(notDir)).toBe(false);
  });

  it.skipIf(process.platform === "win32")(
    "returns true for a dangling symlink (lstat)",
    async () => {
      const linkPath = join(testDir, "dangling-link");
      const target = join(testDir, "does-not-exist");
      symlinkSync(target, linkPath);
      expect(await detector.pathExists(linkPath)).toBe(true);
    },
  );

  it("resolves relative paths against an explicit cwd", async () => {
    const filePath = join(testDir, "relative.txt");
    writeFileSync(filePath, "content");
    expect(await detector.pathExists("relative.txt", testDir)).toBe(true);
    expect(await detector.pathExists("missing.txt", testDir)).toBe(false);
  });

  it("returns false for an empty string", async () => {
    expect(await detector.pathExists("")).toBe(false);
  });

  it("returns true when path triggers EACCES (security-first)", async () => {
    vi.doMock("node:fs/promises", () => ({
      lstat: vi.fn().mockRejectedValue({ code: "EACCES" }),
    }));
    vi.resetModules();
    const { Detector: D } = await import("../src/core/detector");
    const testDetector = new D();
    expect(await testDetector.pathExists("/some/protected/path")).toBe(true);
  });

  it("returns true when path triggers EPERM (security-first)", async () => {
    vi.doMock("node:fs/promises", () => ({
      lstat: vi.fn().mockRejectedValue({ code: "EPERM" }),
    }));
    vi.resetModules();
    const { Detector: D } = await import("../src/core/detector");
    const testDetector = new D();
    expect(await testDetector.pathExists("/some/blocked/path")).toBe(true);
  });
});

describe("Detector.isPathAllowed", () => {
  let detector: Detector;

  beforeEach(() => {
    detector = new Detector();
  });

  it("returns true when path exactly matches an allowed directory", () => {
    expect(detector.isPathAllowed(["/project"], "/project", "/project")).toBe(
      true,
    );
  });

  it("returns true when path is a subdirectory of an allowed dir", () => {
    expect(
      detector.isPathAllowed(["/project"], "/project/src", "/project"),
    ).toBe(true);
  });

  it("returns true when path is a subdirectory using PATH_SEP", () => {
    expect(
      detector.isPathAllowed(["/project"], "/project/node_modules", "/project"),
    ).toBe(true);
  });

  it("returns false when path is outside all allowed directories", () => {
    expect(
      detector.isPathAllowed(["/project"], "/other/path", "/project"),
    ).toBe(false);
  });

  it("returns false when path is a sibling of an allowed directory", () => {
    expect(
      detector.isPathAllowed(["/project"], "/project2/file", "/project"),
    ).toBe(false);
  });

  it("checks multiple allowed directories", () => {
    expect(
      detector.isPathAllowed(
        ["/project", "/shared"],
        "/shared/lib",
        "/project",
      ),
    ).toBe(true);
  });

  it("returns false when no allowed directories match", () => {
    expect(detector.isPathAllowed(["/project"], "/tmp/file", "/project")).toBe(
      false,
    );
  });
});

describe("Detector.getGitignoredFiles", () => {
  it("returns only file paths when isDirectory returns false", () => {
    const mockExec = vi.fn().mockReturnValue("node_modules\nbuild\nsrc\n");
    const fileDetector = new Detector(mockExec);
    vi.spyOn(fileDetector, "isDirectory").mockReturnValue(false);
    expect(fileDetector.getGitignoredFiles("/any")).toEqual([
      "node_modules",
      "build",
      "src",
    ]);
  });

  it("filters out directories from gitignored paths", () => {
    const mockExec = vi.fn().mockReturnValue("node_modules\nbuild\nsrc\n");
    const detector = new Detector(mockExec);
    vi.spyOn(detector, "isDirectory").mockImplementation(
      (path: string) => path === "src",
    );
    expect(detector.getGitignoredFiles("/any")).toEqual([
      "node_modules",
      "build",
    ]);
  });
});

describe("Detector.isDirectory", () => {
  let testDir: string;
  let detector: Detector;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "detector-isdir-test-"));
    detector = new Detector();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("returns true for an existing directory", () => {
    const dirPath = join(testDir, "subdir");
    mkdirSync(dirPath);
    expect(detector.isDirectory(dirPath)).toBe(true);
  });

  it("returns false for a non-existent path", () => {
    const missing = join(testDir, "nonexistent");
    expect(detector.isDirectory(missing)).toBe(false);
  });

  it("returns false for an existing file", () => {
    const filePath = join(testDir, "file.txt");
    writeFileSync(filePath, "hello");
    expect(detector.isDirectory(filePath)).toBe(false);
  });
});

describe("Detector.getGitignoredDirectories", () => {
  it("returns only directory paths when isDirectory returns true", () => {
    const mockExec = vi.fn().mockReturnValue("node_modules\nbuild\nsrc\n");
    const detector = new Detector(mockExec);
    vi.spyOn(detector, "isDirectory").mockImplementation(
      (path: string) => path === "node_modules",
    );
    expect(detector.getGitignoredDirectories("/any")).toEqual(["node_modules"]);
  });

  it("filters out files from gitignored paths", () => {
    const mockExec = vi.fn().mockReturnValue("node_modules\nbuild\nsrc\n");
    const detector = new Detector(mockExec);
    vi.spyOn(detector, "isDirectory").mockReturnValue(false);
    expect(detector.getGitignoredDirectories("/any")).toEqual([]);
  });
});
