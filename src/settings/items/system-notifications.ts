import { BooleanSettingsItem } from "./boolean";

/**
 * Default value for the systemNotifications setting.
 */
export const SYSTEM_NOTIFICATIONS_DEFAULT = true;

/**
 * Boolean setting: show system notifications when user interaction is needed.
 */
export class SystemNotificationsSettingsItem extends BooleanSettingsItem {
  constructor() {
    super();
    this.options.id = "systemNotifications";
    this.options.label = "System notifications";
    this.options.description =
      "Show system notifications when user interaction is needed";
    this.options.default = SYSTEM_NOTIFICATIONS_DEFAULT;
  }
}
