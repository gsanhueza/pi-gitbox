import type {
  ExtensionCommandContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import {
  AutocompleteItem,
  Container,
  type SettingItem,
} from "@earendil-works/pi-tui";
import { GitboxConfig } from "./config/types";
import { Gitbox } from "./gitbox";
import { Impersonator } from "./core/impersonator";
import { settings } from "./settings";
import { AllowedPathsSettingsItem } from "./settings/items/allowed-paths";
import { SETTINGS_ITEMS } from "./settings/defaults";
import { AllowedPathsEditor } from "./ui/allowed-paths-editor";
import { DialogFactory } from "./ui/dialog/factory";
import { ResettableSettingsList } from "./ui/resettable-settings-list";

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
  /** TUI instance (from the ctx.ui.custom factory) for dialogs. */
  private tui: TUI | null = null;
  /** Theme instance (from the ctx.ui.custom factory) for dialogs. */
  private theme: Theme | null = null;

  constructor(
    private readonly gitbox: Gitbox,
    private readonly impersonator: Impersonator,
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

    // The settings file may have been edited outside this session (manually
    // or by another pi instance): drop the cache so the menu reflects what
    // is on disk
    settings.resetConfigCache();

    this.commandCtx = ctx;
    const { config } = await settings.getConfig();
    const items = this.buildSettingsItems(config);

    await ctx.ui.custom<void>((tui, theme, _kb, done) => {
      this.tui = tui;
      this.theme = theme;
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

    await this.refreshSettingValue(id);
  }

  /**
   * Handles a setting reset — deletes the key and re-renders the list.
   *
   * @param id The setting identifier to reset
   */
  private async handleReset(id: string): Promise<void> {
    // Resetting the whole allowedPaths list is destructive: confirm first
    if (id === "allowedPaths") {
      this.confirmAllowedPathsReset();
      return;
    }
    await this.resetSetting(id);
  }

  /**
   * Shows a confirmation dialog before resetting the allowedPaths list
   * to the empty-array default.
   *
   * @returns Nothing.
   */
  private confirmAllowedPathsReset(): void {
    if (!this.settingsList || !this.theme || !this.tui) return;
    const dialogs = new DialogFactory(this.theme, this.tui);
    const confirm = dialogs.confirm({
      title: "Reset allowed paths",
      message: "Remove all allowed paths?",
      confirmLabel: "Reset",
      onConfirm: () => {
        this.settingsList?.closeModal();
        void this.resetSetting("allowedPaths");
      },
      onCancel: () => this.settingsList?.closeModal(),
    });
    confirm.focused = true;
    this.settingsList.showModal(confirm);
  }

  /**
   * Resets a setting to its default and re-renders.
   *
   * @param id The setting identifier to reset
   */
  private async resetSetting(id: string): Promise<void> {
    await settings.resetKeys([id]);

    // Re-initialize to pick up the reset config
    if (this.commandCtx) {
      await this.gitbox.initialize(this.commandCtx);
    }

    await this.refreshSettingValue(id);
  }

  /**
   * Re-fetches the fresh config and updates a list item's value in place.
   *
   * @param id The setting identifier to refresh
   */
  private async refreshSettingValue(id: string): Promise<void> {
    if (!this.settingsList) return;
    const { config } = await settings.getConfig();
    const item = SETTINGS_ITEMS[id];
    if (item) {
      this.settingsList.updateValue(id, item.format(config) ?? "");
    }
  }

  /**
   * Persists a new allowedPaths array, re-initializes the extension and
   * refreshes the settings row. Called by the AllowedPathsEditor after
   * every mutation.
   *
   * @param next The new paths array
   */
  private async persistAllowedPaths(next: string[]): Promise<void> {
    await settings.setConfig({ allowedPaths: next });

    // Re-initialize to pick up the new configuration
    if (this.commandCtx) {
      await this.gitbox.initialize(this.commandCtx);
    }

    await this.refreshSettingValue("allowedPaths");
  }

  /**
   * Opens the AllowedPathsEditor for the allowedPaths setting row.
   *
   * @param done The submenu close callback
   * @returns The editor component
   */
  private openAllowedPathsEditor(done: () => void): Component {
    if (!this.tui || !this.theme) {
      done();
      return new Container();
    }
    return new AllowedPathsEditor({
      tui: this.tui,
      theme: this.theme,
      // Loaded fresh at editor open and after every change, so re-entering
      // the editor always reflects the persisted configuration
      loadPaths: async () => (await settings.getConfig()).config.allowedPaths,
      onChanged: (next) => this.persistAllowedPaths(next),
      done,
    });
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
      .map((item) => {
        const setting: SettingItem = {
          id: item.id,
          label: item.label,
          description: item.description,
          currentValue: item.format(config) ?? "",
          values: item.values,
        };
        if (item instanceof AllowedPathsSettingsItem) {
          setting.submenu = (_currentValue, done) =>
            this.openAllowedPathsEditor(done);
        }
        return setting;
      });
  }
}
