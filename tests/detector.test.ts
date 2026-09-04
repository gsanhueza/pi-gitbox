import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Detector } from "../src/detector";

describe("Detector.pathExists", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "detector-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("returns true for an existing file", async () => {
    const filePath = join(testDir, "file.txt");
    writeFileSync(filePath, "hello");
    expect(await Detector.pathExists(filePath)).toBe(true);
  });

  it("returns true for an existing directory", async () => {
    const dirPath = join(testDir, "subdir");
    mkdirSync(dirPath);
    expect(await Detector.pathExists(dirPath)).toBe(true);
  });

  it("returns false for a missing path", async () => {
    const missing = join(testDir, "nonexistent.txt");
    expect(await Detector.pathExists(missing)).toBe(false);
  });

  it("returns false when parent is not a directory (ENOTDIR)", async () => {
    const filePath = join(testDir, "file.txt");
    writeFileSync(filePath, "hello");
    // Trying to access a path *inside* a file → ENOTDIR
    const notDir = join(filePath, "child");
    expect(await Detector.pathExists(notDir)).toBe(false);
  });

  it("returns true for a dangling symlink (lstat)", async () => {
    const linkPath = join(testDir, "dangling-link");
    const target = join(testDir, "does-not-exist");
    symlinkSync(target, linkPath);
    expect(await Detector.pathExists(linkPath)).toBe(true);
  });

  it("resolves relative paths against an explicit cwd", async () => {
    const filePath = join(testDir, "relative.txt");
    writeFileSync(filePath, "content");
    expect(await Detector.pathExists("relative.txt", testDir)).toBe(true);
    expect(await Detector.pathExists("missing.txt", testDir)).toBe(false);
  });

  it("returns false for an empty string", async () => {
    expect(await Detector.pathExists("")).toBe(false);
  });
});
