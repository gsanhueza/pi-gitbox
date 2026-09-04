import { beforeEach, describe, expect, it, vi } from "vitest";
import { Detector } from "../src/detector";
import { checkPathsAccess } from "../src/prompts";

// Mock the modules that checkPathsAccess depends on
vi.mock("../src/detector", () => ({
  Detector: {
    isPathAllowed: vi.fn(),
    pathExists: vi.fn(),
  },
}));

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allowed paths short-circuit without an fs check", async () => {
    vi.mocked(Detector.isPathAllowed).mockReturnValue(true);

    const result = await checkPathsAccess(
      ["/project/file"],
      resolvedDirs,
      mockCtx,
    );
    expect(result).toBeNull();
    expect(Detector.pathExists).not.toHaveBeenCalled();
  });

  it("skipMissing=false: missing path outside allowed dirs blocks", async () => {
    vi.mocked(Detector.isPathAllowed).mockReturnValue(false);
    vi.mocked(Detector.pathExists).mockResolvedValue(false);

    const result = await checkPathsAccess(
      ["/etc/shadow"],
      resolvedDirs,
      mockCtx,
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
  });

  it("skipMissing=true: missing path outside allowed dirs is skipped", async () => {
    vi.mocked(Detector.isPathAllowed).mockReturnValue(false);
    vi.mocked(Detector.pathExists).mockResolvedValue(false);

    const result = await checkPathsAccess(
      ["/nonexistent/path"],
      resolvedDirs,
      mockCtx,
      true,
    );
    expect(result).toBeNull();
  });

  it("skipMissing=true: existing path outside allowed dirs still blocks", async () => {
    vi.mocked(Detector.isPathAllowed).mockReturnValue(false);
    vi.mocked(Detector.pathExists).mockResolvedValue(true);

    const result = await checkPathsAccess(
      ["/etc/shadow"],
      resolvedDirs,
      mockCtx,
      true,
    );
    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
  });

  it("deduplicates paths before checking", async () => {
    vi.mocked(Detector.isPathAllowed).mockReturnValue(false);
    vi.mocked(Detector.pathExists).mockResolvedValue(false);

    await checkPathsAccess(["/a", "/a", "/b"], resolvedDirs, mockCtx, true);
    // pathExists called once per unique path
    expect(Detector.pathExists).toHaveBeenCalledTimes(2);
  });
});
