import { ScalarSettingsItem } from "./scalar";

/**
 * Default value for the systemNotifications setting.
 */
export const SYSTEM_NOTIFICATIONS_DEFAULT = "on" as const;

/**
 * Labels for the system notification display values.
 */
const NOTIFICATION_LABELS: Record<string, string> = {
  on: "On",
  off: "Off",
  persistent: "Persistent",
};

/**
 * Scalar setting for system notifications with on/off/persistent options.
 */
export class SystemNotificationsSettingsItem extends ScalarSettingsItem<
  "on" | "off" | "persistent"
> {
  constructor() {
    super({
      id: "systemNotifications",
      label: "System notifications",
      description: "Show system notifications when user interaction is needed",
      default: SYSTEM_NOTIFICATIONS_DEFAULT,
      labels: NOTIFICATION_LABELS,
    });
  }
}
