import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import {
  AutocompleteItem,
  SettingsList,
  type SettingItem,
} from "@earendil-works/pi-tui";
import { GitboxConfig } from "./config-types";
import { Gitbox } from "./gitbox";
import { settings } from "./settings";

/**
 * Configuration options
 */
enum Options {
  STATUS_BAR = "statusBar",
  DELETE_ON_EXIT = "deleteOnExit",
  BYPASS_GITBOX = "bypassGitbox",
  BYPASS_PATHS = "bypassPaths",
}

/**
 * Handles commands for the pi-gitbox extension.
 */
export class CommandManager {
  constructor(private readonly gitbox: Gitbox) {}

  /**
   * Sets up the argument completions for the `/gitbox` command
   *
   * @param prefix Prefix written by the user
   * @returns Completions with that prefix
   */
  getArgumentCompletions(prefix: string): AutocompleteItem[] | null {
    const available = [
      {
        value: "paths",
        label: "paths",
        description: "Show impersonated paths",
      },
    ];
    const filtered = available.filter((a) => a.value.startsWith(prefix));
    return filtered.length > 0 ? filtered : null;
  }

  /**
   * Handles the `/gitbox` command — opens a SettingsList or shows impersonated paths
   *
   * @param args The subcommand argument (e.g. "paths")
   * @param ctx The extension context
   */
  async runGitbox(args: string, ctx: ExtensionCommandContext): Promise<void> {
    if (args === "paths") {
      return await this.runGitboxPaths(ctx);
    }

    const { config } = await settings.getConfig();
    const items = this.buildSettingsItems(config);

    await ctx.ui.custom<void>((_tui, _theme, _kb, done) =>
      this.createSettingsList(
        items,
        async (id, newValue) => this.handleSettingChange(id, newValue, ctx),
        done,
      ),
    );
  }

  /**
   * Handles the `/gitbox paths` subcommand — shows impersonated paths
   *
   * @param ctx The extension context
   */
  private async runGitboxPaths(ctx: ExtensionCommandContext): Promise<void> {
    const mapper = this.gitbox.getMapper(ctx);

    const lines = Object.entries(mapper)
      .map(([source, target]) => `  ${source} -> ${target}`)
      .join("\n");

    const content = lines
      ? `Impersonated paths:\n${lines}`
      : "No impersonated paths available.";

    ctx.ui.notify(content);
  }

  /**
   * Handles a settings value change — writes the new value and re-renders.
   *
   * @param id The setting identifier
   * @param newValue The new value to apply
   * @param ctx The extension command context
   */
  private async handleSettingChange(
    id: string,
    newValue: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    const key: string = Object.values(Options).find((o) => o === id)!;
    await settings.setConfig({ [key]: newValue === "on" });

    // Update the status bar with the new status
    await this.gitbox.setStatus(ctx);
  }

  /**
   * Creates the SettingsList for the menu.
   *
   * @param items The settings items to display
   * @param onChange Callback when a setting value changes
   * @param onClose Callback when the dialog closes
   * @returns The configured SettingsList instance
   */
  private createSettingsList(
    items: SettingItem[],
    onChange: (id: string, newValue: string) => void,
    onClose: () => void,
  ): SettingsList {
    return new SettingsList(
      items,
      items.length,
      getSettingsListTheme(),
      onChange,
      onClose,
    );
  }

  /**
   * Builds the SettingsList items for the menu.
   *
   * @param config The resolved configuration
   * @returns The array of SettingItem objects
   */
  private buildSettingsItems(config: GitboxConfig): SettingItem[] {
    return [
      {
        id: Options.STATUS_BAR,
        label: "Show in status bar",
        description: "Shows gitbox status in the status bar",
        currentValue: config.statusBar ? "on" : "off",
        values: ["on", "off"],
      },
      {
        id: Options.DELETE_ON_EXIT,
        label: "Delete on exit",
        description: "When exiting Pi, delete the gitbox",
        currentValue: config.deleteOnExit ? "on" : "off",
        values: ["on", "off"],
      },
      {
        id: Options.BYPASS_GITBOX,
        label: "Bypass impersonation",
        description:
          "Skip impersonation of gitignored paths (keeps original paths)",
        currentValue: config.bypassGitbox ? "on" : "off",
        values: ["on", "off"],
      },
      {
        id: Options.BYPASS_PATHS,
        label: "Bypass directories",
        description: "Bypass the restrictions on allowed directories",
        currentValue: config.bypassPaths ? "on" : "off",
        values: ["on", "off"],
      },
    ];
  }
}
