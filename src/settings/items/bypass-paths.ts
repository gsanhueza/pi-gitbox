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
    super();
    this.options.id = "bypassPaths";
    this.options.label = "Bypass directories";
    this.options.description = "Bypass the restrictions on allowed directories";
    this.options.default = BYPASS_PATHS_DEFAULT;
  }
}
