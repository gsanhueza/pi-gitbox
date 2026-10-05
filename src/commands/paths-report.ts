import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { Impersonator } from "../core/impersonator/impersonator";

/**
 * Handles the `/gitbox paths` subcommand — shows the currently
 * impersonated paths.
 */
export class PathsReport {
  /**
   * Creates the report handler.
   *
   * @param impersonator Source of the file/dir path mappers.
   */
  constructor(private readonly impersonator: Impersonator) {}

  /**
   * Shows the impersonated paths for the session's working directory.
   *
   * @param ctx The extension context.
   */
  async run(ctx: ExtensionCommandContext): Promise<void> {
    const fileMapper = this.impersonator.getFileMapper(ctx.cwd);
    const dirMapper = this.impersonator.getDirMapper(ctx.cwd);

    const lines = Object.entries({ ...fileMapper, ...dirMapper })
      .map(([source, target]) => {
        const icon = source in dirMapper ? "📁" : "📄";
        return `  ${icon} ${source} -> ${target}`;
      })
      .join("\n");

    const content = lines
      ? `Impersonated paths:\n${lines}`
      : "No impersonated paths available.";

    ctx.ui.notify(content);
  }
}
