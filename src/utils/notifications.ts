import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Sends a system notification using `notify-send` on Linux.
 * Silently ignores errors on non-Linux platforms.
 *
 * @param message The notification message body.
 */
export async function sendNotification(message: string): Promise<void> {
  try {
    await execFileAsync("notify-send", ["[pi-gitbox]", message]);
  } catch {
    // notify-send not available (non-Linux), silently ignore
  }
}
