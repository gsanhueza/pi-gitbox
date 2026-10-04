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
import { Detector } from "../src/detector";

describe("Detector.execSync methods", () => {
  it("isGitAvailable returns true when execSync succeeds", () => {
    const mockExec = vi.fn().mockReturnValue("git version 2.40.0");
    const detector = new Detector(mockExec);
    expect(detector.isGitAvailable()).toBe(true);
    expect(mockExec).toHaveBeenCalledWith("git -v", { stdio: "pipe" });
  });

  it("isGitAvailable returns false when execSync throws", () => {
    const mockExec = vi.fn().mockImplementation(() => {
      throw new Error("command not found");
    });
    const detector = new Detector(mockExec);
    expect(detector.isGitAvailable()).toBe(false);
  });

  it("isGitProject returns true when execSync succeeds", () => {
    const mockExec = vi.fn().mockReturnValue("true");
    const detector = new Detector(mockExec);
    expect(detector.isGitProject()).toBe(true);
    expect(mockExec).toHaveBeenCalledWith(
      "git rev-parse --is-inside-work-tree",
      { stdio: "pipe" },
    );
  });

  it("isGitProject returns false when execSync throws", () => {
    const mockExec = vi.fn().mockImplementation(() => {
      throw new Error("not a git repo");
    });
    const detector = new Detector(mockExec);
    expect(detector.isGitProject()).toBe(false);
  });

  it("getGitignoredPaths returns parsed lines on success", () => {
    const mockExec = vi.fn().mockReturnValue("node_modules\nbuild\n");
    const detector = new Detector(mockExec);
    expect(detector.getGitignoredPaths()).toEqual(["node_modules", "build"]);
  });

  it("getGitignoredPaths returns empty array when execSync throws", () => {
    const mockExec = vi.fn().mockImplementation(() => {
      throw new Error("not a git repo");
    });
    const detector = new Detector(mockExec);
    expect(detector.getGitignoredPaths()).toEqual([]);
  });

  it("dynamicCheck returns true when execSync succeeds", () => {
    const mockExec = vi.fn();
    const detector = new Detector(mockExec);
    expect(detector.dynamicCheck("src/file.ts")).toBe(true);
    expect(mockExec).toHaveBeenCalledWith("git check-ignore src/file.ts", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
  });

  it("dynamicCheck returns false when execSync throws", () => {
    const mockExec = vi.fn().mockImplementation(() => {
      throw new Error("not ignored");
    });
    const detector = new Detector(mockExec);
    expect(detector.dynamicCheck("src/file.ts")).toBe(false);
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

  it("returns true for a dangling symlink (lstat)", async () => {
    const linkPath = join(testDir, "dangling-link");
    const target = join(testDir, "does-not-exist");
    symlinkSync(target, linkPath);
    expect(await detector.pathExists(linkPath)).toBe(true);
  });

  it("resolves relative paths against an explicit cwd", async () => {
    const filePath = join(testDir, "relative.txt");
    writeFileSync(filePath, "content");
    expect(await detector.pathExists("relative.txt", testDir)).toBe(true);
    expect(await detector.pathExists("missing.txt", testDir)).toBe(false);
  });

  it("returns false for an empty string", async () => {
    expect(await detector.pathExists("")).toBe(false);
  });
});
