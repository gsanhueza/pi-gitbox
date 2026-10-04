import { BooleanSettingsItem } from "./boolean";

/**
 * Default value for the skipMissingPaths setting.
 */
export const SKIP_MISSING_PATHS_DEFAULT = false;

/**
 * Boolean setting: only check paths that exist on disk.
 */
export class SkipMissingPathsSettingsItem extends BooleanSettingsItem {
  constructor() {
    super();
    this.options.id = "skipMissingPaths";
    this.options.label = "Skip missing paths";
    this.options.description =
      "Only check paths that exist on disk (writes always check)";
    this.options.default = SKIP_MISSING_PATHS_DEFAULT;
  }
}
