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
    super({
      id: "statusBar",
      label: "Show in status bar",
      description: "Shows gitbox status in the status bar",
      default: STATUS_BAR_DEFAULT,
    });
  }
}
