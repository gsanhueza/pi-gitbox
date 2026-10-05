import { beforeEach, describe, expect, it, vi } from "vitest";
import { Detector } from "../src/core/detector";
import { checkPathsAccess } from "../src/prompts";
import { Settings } from "../src/settings";

// Mock askUserOrBlock
vi.mock("../src/prompts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/prompts")>();
  return {
    ...actual,
    askUserOrBlock: vi
      .fn()
      .mockResolvedValue({ block: true, reason: "blocked" }),
  };
});

describe("checkPathsAccess", () => {
  const mockCtx = { cwd: "/project" } as any;
  const resolvedDirs = ["/project"];
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
      ["/project/file"],
      resolvedDirs,
      mockCtx,
    );
    expect(result).toBeNull();
    expect(pathExistsSpy).not.toHaveBeenCalled();
  });

  it("missing path with no existing parent is skipped", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockResolvedValue(false);

    const result = await checkPathsAccess(
      mockSettings,
      detector,
      ["/nonexistent/path"],
      resolvedDirs,
      mockCtx,
    );
    expect(result).toBeNull();
  });

  it("existing parent prompts for the parent", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockImplementation(async (path: string) =>
      path === "/nonexistent" ? true : false,
    );

    const result = await checkPathsAccess(
      mockSettings,
      detector,
      ["/nonexistent/path"],
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
      ["/etc/shadow"],
      resolvedDirs,
      mockCtx,
    );
    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
  });

  it("deduplicates paths before checking", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockResolvedValue(false);

    await checkPathsAccess(
      mockSettings,
      detector,
      ["/a", "/a", "/b"],
      resolvedDirs,
      mockCtx,
    );
    // pathExists called once per unique path
    expect(detector.pathExists).toHaveBeenCalledTimes(2);
  });
});
