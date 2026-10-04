import { BooleanSettingsItem } from "./boolean";

/**
 * Default value for the bypassGitbox setting.
 */
export const BYPASS_GITBOX_DEFAULT = false;

/**
 * Boolean setting: skip impersonation of gitignored paths.
 */
export class BypassGitboxSettingsItem extends BooleanSettingsItem {
  constructor() {
    super({
      id: "bypassGitbox",
      label: "Bypass impersonation",
      description:
        "Skip impersonation of gitignored paths (keeps original paths)",
      default: BYPASS_GITBOX_DEFAULT,
    });
  }
}
