import { BooleanSettingsItem } from "./boolean";

/**
 * Default value for the bypassPaths setting.
 */
export const BYPASS_PATHS_DEFAULT = false;

/**
 * Boolean setting: bypass the restrictions on allowed directories.
 */
export class BypassPathsSettingsItem extends BooleanSettingsItem {
  constructor() {
    super({
      id: "bypassPaths",
      label: "Bypass directories",
      description: "Bypass the restrictions on allowed directories",
      default: BYPASS_PATHS_DEFAULT,
    });
  }
}
