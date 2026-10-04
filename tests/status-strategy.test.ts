import { beforeEach, describe, expect, it, vi } from "vitest";
import { Status } from "../src/config/types";
import { Detector } from "../src/core/detector";
import { StatusStrategy } from "../src/core/status-strategy";

describe("StatusStrategy", () => {
  let detector: Detector;
  let strategy: StatusStrategy;

  beforeEach(() => {
    detector = new Detector();
    strategy = new StatusStrategy(detector);
  });

  it("returns BYPASSED when bypassGitbox is enabled", () => {
    const config = { bypassGitbox: true } as any;
    expect(strategy.resolve(config)).toBe(Status.BYPASSED);
  });

  it("returns UNAVAILABLE when git is not available", () => {
    vi.spyOn(detector, "isGitAvailable").mockReturnValue(false);
    const config = { bypassGitbox: false } as any;
    expect(strategy.resolve(config)).toBe(Status.UNAVAILABLE);
  });

  it("returns NOT_REQUIRED when not a git project", () => {
    vi.spyOn(detector, "isGitAvailable").mockReturnValue(true);
    vi.spyOn(detector, "isGitProject").mockReturnValue(false);
    const config = { bypassGitbox: false } as any;
    expect(strategy.resolve(config)).toBe(Status.NOT_REQUIRED);
  });

  it("returns AVAILABLE when no gitignored paths exist", () => {
    vi.spyOn(detector, "isGitAvailable").mockReturnValue(true);
    vi.spyOn(detector, "isGitProject").mockReturnValue(true);
    vi.spyOn(detector, "getGitignoredPaths").mockReturnValue([]);
    const config = { bypassGitbox: false } as any;
    expect(strategy.resolve(config)).toBe(Status.AVAILABLE);
  });

  it("returns ENABLED when gitignored paths exist", () => {
    vi.spyOn(detector, "isGitAvailable").mockReturnValue(true);
    vi.spyOn(detector, "isGitProject").mockReturnValue(true);
    vi.spyOn(detector, "getGitignoredPaths").mockReturnValue([
      "node_modules",
      "dist",
    ]);
    const config = { bypassGitbox: false } as any;
    expect(strategy.resolve(config)).toBe(Status.ENABLED);
  });

  it("evaluates conditions in priority order", () => {
    // Even though git is available and there are no ignored paths,
    // bypassGitbox takes highest priority
    vi.spyOn(detector, "isGitAvailable").mockReturnValue(true);
    vi.spyOn(detector, "isGitProject").mockReturnValue(true);
    vi.spyOn(detector, "getGitignoredPaths").mockReturnValue([]);
    const config = { bypassGitbox: true } as any;
    expect(strategy.resolve(config)).toBe(Status.BYPASSED);
  });
});
