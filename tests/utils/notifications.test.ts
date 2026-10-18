import { describe, expect, it, vi } from "vitest";
import { sendNotification } from "../../src/utils/notifications";

describe("sendNotification", () => {
  it("does not call execFile when priority is off", () => {
    const mockExecFile = vi.fn();
    sendNotification("hello", "off", mockExecFile);
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it("calls execFile with correct args for priority on", () => {
    const mockExecFile = vi.fn();
    sendNotification("hello world", "on", mockExecFile);
    expect(mockExecFile).toHaveBeenCalledWith(
      "notify-send",
      ["-a", "pi-gitbox", "Access requested", "hello world"],
      expect.any(Function),
    );
  });

  it("calls execFile with correct args for persistent priority", () => {
    const mockExecFile = vi.fn();
    sendNotification("urgent", "persistent", mockExecFile);
    expect(mockExecFile).toHaveBeenCalledWith(
      "notify-send",
      ["-a", "pi-gitbox", "Access requested", "urgent", "-u", "critical"],
      expect.any(Function),
    );
  });

  it("defaults to on priority", () => {
    const mockExecFile = vi.fn();
    sendNotification("default priority", "on", mockExecFile);
    expect(mockExecFile).toHaveBeenCalledWith(
      "notify-send",
      ["-a", "pi-gitbox", "Access requested", "default priority"],
      expect.any(Function),
    );
  });

  it("does not throw when execFile throws", () => {
    const mockExecFile = vi.fn(() => {
      throw new Error("notify-send not found");
    });
    expect(() => sendNotification("test", "on", mockExecFile)).not.toThrow();
  });
});
