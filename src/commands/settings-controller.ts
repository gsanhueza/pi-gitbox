import type {
  ExtensionCommandContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import { Container, type SettingItem } from "@earendil-works/pi-tui";
import type { GitboxConfig } from "../config/types";
import type { Gitbox } from "../gitbox";
import { AllowedPathsSettingsItem } from "../settings/items/allowed-paths";
import { SETTINGS_ITEMS } from "../settings/defaults";
import { AllowedPathsEditor } from "../ui/allowed-paths-editor";
import { DialogFactory } from "../ui/dialog/factory";
import { ResettableSettingsList } from "../ui/resettable-settings-list";
import type { Settings } from "../settings";

/**
 * Opens the `/gitbox` settings menu and applies changes made through it:
 * writes new values, resets overrides, and re-initializes the extension
 * so the new configuration takes effect.
 */
export class SettingsMenuController {
  /** Reference to the active settings list for re-rendering on reset. */
  private settingsList: ResettableSettingsList | null = null;
  /** Cached context for async callbacks. */
  private commandCtx: ExtensionCommandContext | null = null;
  /** TUI instance (from the ctx.ui.custom factory) for dialogs. */
  private tui: TUI | null = null;
  /** Theme instance (from the ctx.ui.custom factory) for dialogs. */
  private theme: Theme | null = null;

  /**
   * Creates the controller.
   *
   * @param gitbox Re-initialized after configuration changes.
   * @param settings Settings store read/written by the menu.
   */
  constructor(
    private readonly gitbox: Gitbox,
    private readonly settings: Settings,
  ) {}

  /**
   * Opens the settings menu.
   *
   * The settings file may have been edited outside this session (manually
   * or by another pi instance): the cache is dropped first so the menu
   * reflects what is on disk.
   *
   * @param ctx The extension context.
   */
  async run(ctx: ExtensionCommandContext): Promise<void> {
    this.settings.resetConfigCache();

    this.commandCtx = ctx;
    const { config } = await this.settings.getConfig();
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
   * Handles a settings value change — writes the new value and re-renders.
   *
   * @param id The setting identifier
   * @param newValue The new value to apply
   */
  private async handleSettingChange(
    id: string,
    newValue: string,
  ): Promise<void> {
    const { config } = await this.settings.getConfig();
    const item = SETTINGS_ITEMS[id];
    const result = item.setConfig(config, newValue);
    if (result.valid && result.config) {
      await this.settings.setConfig(result.config);
    }

    await this.applyConfigChange(id);
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
    await this.settings.resetKeys([id]);
    await this.applyConfigChange(id);
  }

  /**
   * Re-initializes the extension to pick up the changed configuration
   * and refreshes the settings row.
   *
   * @param id The setting identifier that changed
   */
  private async applyConfigChange(id: string): Promise<void> {
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
    const { config } = await this.settings.getConfig();
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
    await this.settings.setConfig({ allowedPaths: next });
    await this.applyConfigChange("allowedPaths");
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
      loadPaths: async () =>
        (await this.settings.getConfig()).config.allowedPaths,
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
