import { GitboxConfig } from "../../config-types";
import type { GitboxConfig as GitboxConfigType } from "../../config-types";
import { GITBOX_BASEDIR, TEMPORAL_GITBOX } from "../../defaults";
import { ScalarSettingsItem } from "./scalar";

/**
 * Labels displayed in the menu for the baseDir setting.
 */
export const BASE_DIR_LABELS: Record<string, string> = {
  [GITBOX_BASEDIR]: "Agent directory",
  [TEMPORAL_GITBOX]: "Temporal folder",
};

/**
 * Enum-based settings item for baseDir with two selectable options.
 *
 * The menu shows "Agent directory" and "Temporal folder".
 * The stored value is the resolved path (not the label).
 * If the stored path doesn't match either default, it shows
 * "Custom path (<path>)" in the menu.
 */
export class BaseDirSettingsItem extends ScalarSettingsItem<string> {
  constructor() {
    super({
      id: "baseDir",
      label: "Gitbox location",
      description: "Where to store the gitbox data",
      default: GITBOX_BASEDIR,
      labels: BASE_DIR_LABELS,
    });
  }

  /**
   * Formats the current config value for display.
   *
   * @param config The current GitboxConfig.
   * @returns The formatted display string, or undefined if unset.
   */
  format(config: GitboxConfigType): string | undefined {
    const value = config.baseDir;
    if (value === undefined || value === null) return undefined;

    // Check if the stored value matches one of the known defaults
    const label = BASE_DIR_LABELS[value];
    if (label) return label;

    // Custom path — show a descriptive label
    return `Custom path (${value})`;
  }
}
