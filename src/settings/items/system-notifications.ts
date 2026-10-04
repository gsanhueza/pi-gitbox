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
    super({
      id: "systemNotifications",
      label: "System notifications",
      description: "Show system notifications when user interaction is needed",
      default: SYSTEM_NOTIFICATIONS_DEFAULT,
    });
  }
}
