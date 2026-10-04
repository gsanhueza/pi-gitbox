import type { GitboxConfig } from "../../config-types";
import { SettingsItem, type ValidationResult } from "../base";

/**
 * Group settings item for allowedPaths.
 *
 * This item does not have a direct value — Enter opens a submenu
 * (the AllowedPathsEditor) for managing the list of allowed paths.
 */
export class AllowedPathsSettingsItem extends SettingsItem {
  readonly id = "allowedPaths";
  readonly label = "Allowed paths";
  readonly description =
    "Extra paths that are always allowed (beyond the built-in ones)";

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
   * Not applicable for group items: the editor writes the paths array
   * directly via `settings.setConfig`, bypassing the display-value
   * round-trip used by dropdown items.
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
