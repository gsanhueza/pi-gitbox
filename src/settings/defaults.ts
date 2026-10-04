import type { SettingsItem } from "./base";
import { AllowedPathsSettingsItem } from "./items/allowed-paths";
import { BaseDirSettingsItem } from "./items/base-dir";
import { BypassGitboxSettingsItem } from "./items/bypass-gitbox";
import { BypassPathsSettingsItem } from "./items/bypass-paths";
import { DeleteOnExitSettingsItem } from "./items/delete-on-exit";
import { ImpersonateDirsSettingsItem } from "./items/impersonate-dirs";
import { SkipMissingPathsSettingsItem } from "./items/skip-missing-paths";
import { StatusBarSettingsItem } from "./items/status-bar";
import { SystemNotificationsSettingsItem } from "./items/system-notifications";

/**
 * Settings item definitions.
 *
 * Instantiated at module load time; consumed by Settings and
 * menu construction.
 */
export const SETTINGS_ITEMS: Record<string, SettingsItem> = {
  statusBar: new StatusBarSettingsItem(),
  deleteOnExit: new DeleteOnExitSettingsItem(),
  impersonateDirs: new ImpersonateDirsSettingsItem(),
  bypassGitbox: new BypassGitboxSettingsItem(),
  bypassPaths: new BypassPathsSettingsItem(),
  skipMissingPaths: new SkipMissingPathsSettingsItem(),
  systemNotifications: new SystemNotificationsSettingsItem(),
  baseDir: new BaseDirSettingsItem(),
  allowedPaths: new AllowedPathsSettingsItem(),
};
