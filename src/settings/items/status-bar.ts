import { BooleanSettingsItem } from "./boolean";

/**
 * Default value for the statusBar setting.
 */
export const STATUS_BAR_DEFAULT = true;

/**
 * Boolean setting: show gitbox status in the status bar.
 */
export class StatusBarSettingsItem extends BooleanSettingsItem {
  constructor() {
    super();
    this.options.id = "statusBar";
    this.options.label = "Show in status bar";
    this.options.description = "Shows gitbox status in the status bar";
    this.options.default = STATUS_BAR_DEFAULT;
  }
}
