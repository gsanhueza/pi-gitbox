import { beforeEach, describe, expect, it, vi } from "vitest";
import { BASE_ALLOWED_PATHS } from "../src/config/defaults";
import { Detector } from "../src/core/detector";
import { Impersonator } from "../src/core/impersonator/impersonator";
import { ToolCallProcessor } from "../src/core/tool-call-processor";
import { checkPathsAccess } from "../src/path-access";
import { Settings } from "../src/settings";

vi.mock("../src/path-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/path-access")>();
  return {
    ...actual,
    checkPathsAccess: vi.fn().mockResolvedValue({ block: false }),
  };
});

const mockCheckPathsAccess = vi.mocked(checkPathsAccess);

describe("ToolCallProcessor", () => {
  const mockCtx = { cwd: "/project" } as any;
  const baseConfig = {
    bypassPaths: false,
    bypassGitbox: false,
    allowedPaths: ["/extra"],
  } as any;
  const resolvedDirs = [...BASE_ALLOWED_PATHS, "/extra"];

  let detector: Detector;
  let impersonator: Impersonator;
  const mockSettings = {} as Settings;
  let processor: ToolCallProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPathsAccess.mockResolvedValue({ block: false });
    detector = new Detector();
    impersonator = {
      extractFromCommand: vi.fn().mockReturnValue([]),
      resolveCommand: vi.fn().mockResolvedValue("resolved-command"),
      resolvePath: vi.fn().mockResolvedValue("resolved-path"),
    } as unknown as Impersonator;
    processor = new ToolCallProcessor(mockSettings, detector, impersonator);
  });

  it("checks command paths and impersonates bash commands", async () => {
    vi.mocked(impersonator.extractFromCommand).mockReturnValue(["/a", "/b"]);

    const event = {
      type: "tool_call",
      toolName: "bash",
      input: { command: "cat file" },
    } as any;
    const result = await processor.handle(event, mockCtx, baseConfig);

    expect(result).toBeUndefined();
    expect(mockCheckPathsAccess).toHaveBeenCalledWith(
      mockSettings,
      detector,
      ["/a", "/b"],
      resolvedDirs,
      mockCtx,
    );
    expect(impersonator.resolveCommand).toHaveBeenCalledWith(
      "cat file",
      "/project",
    );
    expect(event.input.command).toBe("resolved-command");
  });

  it("checks the path and impersonates path-based tool calls", async () => {
    const event = {
      type: "tool_call",
      toolName: "read",
      input: { path: "secrets.env" },
    } as any;
    const result = await processor.handle(event, mockCtx, baseConfig);

    expect(result).toBeUndefined();
    expect(mockCheckPathsAccess).toHaveBeenCalledWith(
      mockSettings,
      detector,
      ["secrets.env"],
      resolvedDirs,
      mockCtx,
    );
    expect(impersonator.resolvePath).toHaveBeenCalledWith(
      "secrets.env",
      "/project",
    );
    expect(event.input.path).toBe("resolved-path");
  });

  it("skips the access check when bypassPaths is enabled", async () => {
    const event = {
      type: "tool_call",
      toolName: "bash",
      input: { command: "cat file" },
    } as any;

    await processor.handle(event, mockCtx, {
      ...baseConfig,
      bypassPaths: true,
    });

    expect(mockCheckPathsAccess).not.toHaveBeenCalled();
    expect(impersonator.resolveCommand).toHaveBeenCalled();
  });

  it("skips impersonation when bypassGitbox is enabled", async () => {
    const event = {
      type: "tool_call",
      toolName: "bash",
      input: { command: "cat file" },
    } as any;

    const result = await processor.handle(event, mockCtx, {
      ...baseConfig,
      bypassGitbox: true,
    });

    expect(result).toBeUndefined();
    expect(mockCheckPathsAccess).toHaveBeenCalled();
    expect(impersonator.resolveCommand).not.toHaveBeenCalled();
    expect(event.input.command).toBe("cat file");
  });

  it("skips impersonation of paths when bypassGitbox is enabled", async () => {
    const event = {
      type: "tool_call",
      toolName: "read",
      input: { path: "secrets.env" },
    } as any;

    await processor.handle(event, mockCtx, {
      ...baseConfig,
      bypassGitbox: true,
    });

    expect(impersonator.resolvePath).not.toHaveBeenCalled();
    expect(event.input.path).toBe("secrets.env");
  });

  it("returns the blocked response without impersonating", async () => {
    const blocked = { block: true, reason: "denied" };
    mockCheckPathsAccess.mockResolvedValue(blocked);
    const event = {
      type: "tool_call",
      toolName: "bash",
      input: { command: "cat file" },
    } as any;

    const result = await processor.handle(event, mockCtx, baseConfig);

    expect(result).toEqual(blocked);
    expect(impersonator.resolveCommand).not.toHaveBeenCalled();
  });

  it("ignores events that are neither bash nor path-based", async () => {
    const event = {
      type: "tool_call",
      toolName: "webfetch",
      input: { url: "https://x.com" },
    } as any;

    const result = await processor.handle(event, mockCtx, baseConfig);

    expect(result).toBeUndefined();
    expect(mockCheckPathsAccess).not.toHaveBeenCalled();
    expect(impersonator.resolveCommand).not.toHaveBeenCalled();
    expect(impersonator.resolvePath).not.toHaveBeenCalled();
  });
});
