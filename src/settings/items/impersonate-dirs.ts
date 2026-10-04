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
    super({
      id: "impersonateDirs",
      label: "Impersonate directories",
      description: "Also impersonate gitignored directories",
      default: IMPERSONATE_DIRS_DEFAULT,
    });
  }
}
