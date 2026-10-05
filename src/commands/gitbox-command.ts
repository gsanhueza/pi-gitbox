import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem } from "@earendil-works/pi-tui";
import { PathsReport } from "./paths-report";
import { SettingsMenuController } from "./settings-controller";

/** Subcommand that shows impersonated paths. */
const PATHS_SUBCOMMAND = "paths";

/**
 * Handles the `/gitbox` command: dispatches subcommands to their
 * handlers and opens the settings menu when no subcommand is given.
 */
export class GitboxCommand {
  /**
   * Creates the command.
   *
   * @param pathsReport Handler for the `paths` subcommand.
   * @param settingsMenu Handler for the settings menu.
   */
  constructor(
    private readonly pathsReport: PathsReport,
    private readonly settingsMenu: SettingsMenuController,
  ) {}

  /**
   * Sets up the argument completions for the `/gitbox` command
   *
   * @param prefix Prefix written by the user
   * @returns Completions with that prefix
   */
  getArgumentCompletions(prefix: string): AutocompleteItem[] | null {
    const available = [
      {
        value: PATHS_SUBCOMMAND,
        label: PATHS_SUBCOMMAND,
        description: "Show impersonated paths",
      },
    ];
    const filtered = available.filter((a) => a.value.startsWith(prefix));
    return filtered.length > 0 ? filtered : null;
  }

  /**
   * Handles the `/gitbox` command — dispatches to a subcommand or opens
   * the settings menu.
   *
   * @param args The subcommand argument (e.g. "paths")
   * @param ctx The extension context
   */
  async run(args: string, ctx: ExtensionCommandContext): Promise<void> {
    if (args === PATHS_SUBCOMMAND) {
      return await this.pathsReport.run(ctx);
    }
    return await this.settingsMenu.run(ctx);
  }
}
