import type { GitboxConfig } from "../../config-types";
import { SettingsItem, type ValidationResult } from "../base";

/**
 * Group settings item for allowedPaths.
 *
 * This item does not have a direct value — it opens a submenu
 * for managing the list of allowed paths.
 */
export class AllowedPathsSettingsItem extends SettingsItem {
  readonly id = "allowedPaths";
  readonly label = "Allowed paths";
  readonly description =
    "Extra paths that are always allowed (beyond the built-in ones)";
  readonly values = undefined;

  /**
   * Formats the current allowedPaths as a display string.
   *
   * @param config The current GitboxConfig.
   * @returns The number of allowed paths, or "None" if empty.
   */
  format(config: GitboxConfig): string {
    const paths = config.allowedPaths;
    if (!paths || paths.length === 0) {
      return "None";
    }
    return `${paths.length} path(s)`;
  }

  /**
   * Validation is not applicable for group items.
   *
   * @param _config The current GitboxConfig.
   * @param _value The display-value string from the user.
   * @returns A ValidationResult indicating no-op.
   */
  setConfig(_config: GitboxConfig, _value: string): ValidationResult {
    return { valid: true };
  }

  /**
   * Returns a partial config with an empty allowedPaths array.
   *
   * @param defaults The default GitboxConfig.
   * @returns A partial config with allowedPaths reset.
   */
  reset(defaults: GitboxConfig): Partial<GitboxConfig> {
    return { allowedPaths: [] };
  }
}
