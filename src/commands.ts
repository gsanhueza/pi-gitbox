import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { AutocompleteItem, type SettingItem } from "@earendil-works/pi-tui";
import { GitboxConfig } from "./config-types";
import { Gitbox } from "./gitbox";
import { settings } from "./settings";
import { ResettableSettingsList } from "./ui/resettable-settings-list";
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
  /** Reference to the active settings list for re-rendering on reset. */
  private settingsList: ResettableSettingsList | null = null;
  /** Cached context for async callbacks. */
  private commandCtx: ExtensionCommandContext | null = null;

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

    this.commandCtx = ctx;
    const { config } = await settings.getConfig();
    const items = this.buildSettingsItems(config);

    await ctx.ui.custom<void>((tui, _theme, _kb, done) => {
      this.settingsList = new ResettableSettingsList(
        items,
        items.length,
        getSettingsListTheme(),
        (id, newValue) => this.handleSettingChange(id, newValue),
        () => done(),
        (id) => this.handleReset(id),
        tui,
      );
      return this.settingsList;
    });
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
   */
  private async handleSettingChange(
    id: string,
    newValue: string,
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
    if (this.commandCtx) {
      await this.gitbox.initialize(this.commandCtx);
    }

    // Re-fetch fresh config and update the list item value in place
    if (this.settingsList) {
      const { config: freshConfig } = await settings.getConfig();
      const freshItem = SETTINGS_ITEMS[id];
      if (freshItem) {
        this.settingsList.updateValue(id, freshItem.format(freshConfig) ?? "");
      }
    }
  }

  /**
   * Handles a setting reset — deletes the key and re-renders the list.
   *
   * @param id The setting identifier to reset
   */
  private async handleReset(id: string): Promise<void> {
    await settings.resetKeys([id]);

    // Re-initialize to pick up the reset config
    if (this.commandCtx) {
      await this.gitbox.initialize(this.commandCtx);
    }

    // Update the list item value in place
    if (this.settingsList) {
      const { config } = await settings.getConfig();
      const item = SETTINGS_ITEMS[id];
      if (item) {
        this.settingsList.updateValue(id, item.format(config) ?? "");
      }
    }
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
