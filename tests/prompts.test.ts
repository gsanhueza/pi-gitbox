import { beforeEach, describe, expect, it, vi } from "vitest";
import { Detector } from "../src/core/detector";
import { checkPathsAccess } from "../src/prompts";

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
  let detector: Detector;

  beforeEach(() => {
    vi.clearAllMocks();
    detector = new Detector();
  });

  it("allowed paths short-circuit without an fs check", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(true);
    const pathExistsSpy = vi.spyOn(detector, "pathExists");

    const result = await checkPathsAccess(
      detector,
      ["/project/file"],
      resolvedDirs,
      mockCtx,
    );
    expect(result).toBeNull();
    expect(pathExistsSpy).not.toHaveBeenCalled();
  });

  it("skipMissing=false: missing path outside allowed dirs blocks", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockResolvedValue(false);

    const result = await checkPathsAccess(
      detector,
      ["/etc/shadow"],
      resolvedDirs,
      mockCtx,
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
  });

  it("skipMissing=true: missing path outside allowed dirs is skipped", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockResolvedValue(false);

    const result = await checkPathsAccess(
      detector,
      ["/nonexistent/path"],
      resolvedDirs,
      mockCtx,
      true,
    );
    expect(result).toBeNull();
  });

  it("skipMissing=true: existing path outside allowed dirs still blocks", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockResolvedValue(true);

    const result = await checkPathsAccess(
      detector,
      ["/etc/shadow"],
      resolvedDirs,
      mockCtx,
      true,
    );
    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
  });

  it("deduplicates paths before checking", async () => {
    vi.spyOn(detector, "isPathAllowed").mockReturnValue(false);
    vi.spyOn(detector, "pathExists").mockResolvedValue(false);

    await checkPathsAccess(
      detector,
      ["/a", "/a", "/b"],
      resolvedDirs,
      mockCtx,
      true,
    );
    // pathExists called once per unique path
    expect(detector.pathExists).toHaveBeenCalledTimes(2);
  });
});
