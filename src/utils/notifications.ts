import type { ExecFileException } from "node:child_process";

/**
 * Minimal call signature of node's `execFile` used to fire-and-forget
 * notifications. Kept structural so test mocks remain assignable.
 */
type ExecFileFn = (
  file: string,
  args: readonly string[],
  callback: (
    error: ExecFileException | null,
    stdout: string,
    stderr: string,
  ) => void,
) => void;

/**
 * Notification priority levels for `notify-send`.
 * - "on": default urgency (normal)
 * - "off": skip sending the notification
 * - "persistent": critical urgency, stays until dismissed
 */
type NotificationPriority = "on" | "off" | "persistent";

/**
 * Sends a system notification using `notify-send` on Linux.
 * Silently ignores errors on non-Linux platforms.
 *
 * @param message The notification message body.
 * @param priority The notification priority level.
 * @param execFile The execFile function to invoke.
 */
export function sendNotification(
  message: string,
  priority: NotificationPriority = "on",
  execFile: ExecFileFn,
): void {
  if (priority === "off") return;

  try {
    const title = "Access requested";
    const args = ["-a", "pi-gitbox", title, message];

    if (priority === "persistent") args.push("-u", "critical");
    execFile("notify-send", args, () => {});
  } catch {
    // notify-send not available (non-Linux), silently ignore
  }
}
