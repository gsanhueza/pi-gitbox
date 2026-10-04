import { BooleanSettingsItem } from "./boolean";

/**
 * Default value for the impersonateDirs setting.
 */
export const IMPERSONATE_DIRS_DEFAULT = false;

/**
 * Boolean setting: also impersonate gitignored directories.
 */
export class ImpersonateDirsSettingsItem extends BooleanSettingsItem {
  constructor() {
    super();
    this.options.id = "impersonateDirs";
    this.options.label = "Impersonate directories";
    this.options.description = "Also impersonate gitignored directories";
    this.options.default = IMPERSONATE_DIRS_DEFAULT;
  }
}
