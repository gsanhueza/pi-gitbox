import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Status } from "./config-types";
import { STATUS_KEY } from "./defaults";
import { settings } from "./settings";

export class Renderer {
  private static lastStatus: string = "";

  /**
   * Sets the status of the gitbox in the extension UI.
   * @param ctx The extension context.
   * @param status The status to set
   */
  static async setStatus(ctx: ExtensionContext, status: Status): Promise<void> {
    // Color the status with HEX codes
    const colorMapper: Record<Status, string> = {
      [Status.ENABLED]: "#00ff88",
      [Status.AVAILABLE]: "#ffaa00",
      [Status.NOT_REQUIRED]: "#ff8800",
      [Status.UNAVAILABLE]: "#ff4444",
      [Status.BYPASSED]: "#44ddff",
    };

    const theme = ctx.ui.theme;
    const coloredStatus = Renderer.colorHex(status, colorMapper[status]);

    Renderer.lastStatus = `${theme.fg("dim", "📦 Gitbox:")} ${coloredStatus}`;
    await this.update(ctx);
  }

  /**
   * Updates the status bar with the current status and any bypass indicators.
   *
   * @param ctx The extension context
   */
  static async update(ctx: ExtensionContext): Promise<void> {
    const { config } = await settings.getConfig();
    const { statusBar, bypassPaths } = config;

    // Verify bypass status to announce it in status bar
    let statusText = Renderer.lastStatus;
    if (bypassPaths) statusText += " (unrestricted)";

    if (statusBar) {
      ctx.ui.setStatus(STATUS_KEY, statusText);
    } else {
      ctx.ui.setStatus(STATUS_KEY, undefined);
    }
  }

  /**
   * Applies a custom hex color using 24-bit truecolor ANSI escape codes.
   *
   * @param text The text to colorize
   * @param hex The hex color string, e.g. "#abcdef"
   * @returns The colored text
   */
  private static colorHex(text: string, hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m\u200b`;
  }
}
