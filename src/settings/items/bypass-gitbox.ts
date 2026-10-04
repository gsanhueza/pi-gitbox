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
    super();
    this.options.id = "bypassGitbox";
    this.options.label = "Bypass impersonation";
    this.options.description =
      "Skip impersonation of gitignored paths (keeps original paths)";
    this.options.default = BYPASS_GITBOX_DEFAULT;
  }
}
