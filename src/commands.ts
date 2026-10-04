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
import { SETTINGS_ITEMS } from "./settings/defaults";

/**
 * Configuration options
 */
enum Options {
  STATUS_BAR = "statusBar",
  DELETE_ON_EXIT = "deleteOnExit",
  IMPERSONATE_DIRS = "impersonateDirs",
  BYPASS_GITBOX = "bypassGitbox",
  BYPASS_PATHS = "bypassPaths",
  SKIP_MISSING_PATHS = "skipMissingPaths",
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
    const fileMapper = this.gitbox.getFileMapper(ctx);
    const dirMapper = this.gitbox.getDirMapper(ctx);

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
    const { config } = await settings.getConfig();
    const item = SETTINGS_ITEMS[id];

    if (!item) {
      // Fallback for legacy enum values
      const key: string = Object.values(Options).find((o) => o === id)!;
      await settings.setConfig({ [key]: newValue === "on" });
    } else {
      const result = item.setConfig(config, newValue);
      if (result.valid && result.config) {
        await settings.setConfig(result.config);
      }
    }

    // Re-initialize to pick up the new configuration
    await this.gitbox.initialize(ctx);
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
   * Builds the SettingsList items from registered settings items.
   *
   * @param config The resolved configuration
   * @returns The array of SettingItem objects
   */
  private buildSettingsItems(config: GitboxConfig): SettingItem[] {
    return Object.values(SETTINGS_ITEMS)
      .filter((item) => item.id in config)
      .map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
        currentValue: item.format(config) ?? "",
        values: item.values,
      }));
  }
}
