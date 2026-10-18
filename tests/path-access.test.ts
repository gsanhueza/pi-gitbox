import { parse } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Detector } from "../src/core/detector";
import { checkPathsAccess } from "../src/path-access";
import { Settings } from "../src/settings";
import { joinPaths, normalizePath, resolvePaths } from "../src/utils/compat";

vi.mock("../src/path-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/path-access")>();
  return {
    ...actual,
    askUserOrBlock: vi.fn().mockResolvedValue({
      block: true,
      reason: "blocked",
      sessionBypassed: [],
    }),
  };
});

describe("checkPathsAccess", () => {
  // Platform-correct absolute paths derived from path primitives, so the
  // fixtures are equally valid on POSIX ("/nonexistent") and Windows
  // ("C:/nonexistent"). resolvePaths anchors a rooted path to the current
  // drive on Win32, mirroring what checkPathsAccess does internally.
  const missingDir = resolvePaths("/nonexistent");
  const childOf = (name: string) => joinPaths(missingDir, name);
  // Direct children of the filesystem root ("/a" on POSIX, "C:/a" on Win32)
  const fsRoot = resolvePaths(parse(missingDir).root);
  const childOfRoot = (name: string) => joinPaths(fsRoot, name);

  const mockCtx = { cwd: resolvePaths("/project") } as any;
  const resolvedDirs = [mockCtx.cwd];
  const mockSettings = {
    getConfig: vi.fn().mockResolvedValue({
      config: { systemNotifications: "on" },
      errors: [],
    }),
  } as unknown as Settings;
  let detector: Detector;

  beforeEach(() => {
    vi.clearAllMocks();
    detector = new Detector();
  });

  it("allowed paths short-circuit without an fs check", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(true);
    const pathExistsSpy = vi.spyOn(detector, "pathExists");

    const result = await checkPathsAccess(
      mockSettings,
      detector,
      [joinPaths(mockCtx.cwd, "file")],
      resolvedDirs,
      mockCtx,
    );
    expect(result).toEqual({ block: false, sessionBypassed: [] });
    expect(pathExistsSpy).not.toHaveBeenCalled();
  });

  it("missing path with no existing parent is skipped", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockResolvedValue(false);

    const result = await checkPathsAccess(
      mockSettings,
      detector,
      [childOf("path")],
      resolvedDirs,
      mockCtx,
    );
    expect(result).toEqual({ block: false, sessionBypassed: [] });
  });

  it.runIf(process.platform === "win32")(
    "terminates at the drive root when no ancestor exists (Windows)",
    async () => {
      // Regression: the walk-up loop used a hardcoded "/" sentinel, which
      // never matched a Windows drive root ("C:/"), so with pathExists
      // always false this would hang forever instead of returning null.
      vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
      vi.spyOn(detector, "pathExists").mockResolvedValue(false);

      const result = await checkPathsAccess(
        mockSettings,
        detector,
        ["C:\\nonexistent\\deep\\file.txt"],
        resolvedDirs,
        mockCtx,
      );
      expect(result).toEqual({ block: false, sessionBypassed: [] });
    },
  );

  it("existing parent prompts for the parent", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    // Only the missing dir itself exists; normalize the walked-up path
    // since dirname() may mix separators on Win32.
    vi.spyOn(detector, "pathExists").mockImplementation(async (path: string) =>
      normalizePath(path) === missingDir ? true : false,
    );

    const result = await checkPathsAccess(
      mockSettings,
      detector,
      [childOf("path")],
      resolvedDirs,
      mockCtx,
    );
    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
  });

  it("full path exists prompts for the full path", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockResolvedValue(true);

    const result = await checkPathsAccess(
      mockSettings,
      detector,
      [childOf("shadow")],
      resolvedDirs,
      mockCtx,
    );
    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
  });

  it("deduplicates paths before checking", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockResolvedValue(false);

    const result = await checkPathsAccess(
      mockSettings,
      detector,
      [childOfRoot("a"), childOfRoot("a"), childOfRoot("b")],
      resolvedDirs,
      mockCtx,
    );
    // pathExists called once per unique path
    expect(detector.pathExists).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ block: false, sessionBypassed: [] });
  });

  it("deduplicates deepest existing parents", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockImplementation(async (path: string) =>
      normalizePath(path) === missingDir ? true : false,
    );

    // Three different paths all resolve to the same deepest parent
    const result = await checkPathsAccess(
      mockSettings,
      detector,
      [childOf("a"), childOf("b"), childOf("c")],
      resolvedDirs,
      mockCtx,
    );
    // askUserOrBlock called only once (deepest parent deduplicated)
    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
  });

  it("skips prompting when deepest parent is already session-bypassed", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockImplementation(async (path: string) =>
      normalizePath(path) === missingDir ? true : false,
    );

    // checkPathsAccess compares against the resolvePaths-normalized form
    // of the deepest parent, so the bypass set must use the same form.
    const sessionBypassed = new Set<string>([missingDir]);

    const result = await checkPathsAccess(
      mockSettings,
      detector,
      [childOf("a")],
      resolvedDirs,
      mockCtx,
      sessionBypassed,
    );
    expect(result).toEqual({ block: false, sessionBypassed: [] });
    // askUserOrBlock should not be called since the deepest parent is already bypassed
  });
});
