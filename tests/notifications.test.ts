import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { sendNotification } from "../src/utils/notifications";

describe("sendNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call execFile when priority is off", () => {
    sendNotification("hello", "off");
    expect(execFile).not.toHaveBeenCalled();
  });

  it("calls execFile with correct args for priority on", () => {
    sendNotification("hello world", "on");
    expect(execFile).toHaveBeenCalledWith(
      "notify-send",
      ["-a", "pi-gitbox", "Access requested", "hello world"],
      expect.any(Function),
    );
  });

  it("calls execFile with correct args for persistent priority", () => {
    sendNotification("urgent", "persistent");
    expect(execFile).toHaveBeenCalledWith(
      "notify-send",
      ["-a", "pi-gitbox", "Access requested", "urgent", "-u", "critical"],
      expect.any(Function),
    );
  });

  it("defaults to on priority", () => {
    sendNotification("default priority");
    expect(execFile).toHaveBeenCalledWith(
      "notify-send",
      ["-a", "pi-gitbox", "Access requested", "default priority"],
      expect.any(Function),
    );
  });

  it("does not throw when execFile throws", () => {
    vi.mocked(execFile).mockImplementation(() => {
      throw new Error("notify-send not found");
    });
    expect(() => sendNotification("test", "on")).not.toThrow();
  });
});
