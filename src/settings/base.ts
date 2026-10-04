import type { GitboxConfig } from "../config-types";

/**
 * Validation result returned by `setConfig`.
 */
export interface ValidationResult {
  valid: boolean;
  config?: Partial<GitboxConfig>;
  errors?: string[];
}

/**
 * Abstract base for all settings items.
 *
 * Each concrete subclass owns its own:
 * - `id` — unique setting identifier
 * - `label` — display name
 * - `description` — help text
 * - `values` — possible values (for dropdowns)
 * - `format(config)` — reads current value → string
 * - `setConfig(config, value)` — validates and returns partial config
 * - `reset(defaults)` — returns partial config with default value
 */
export abstract class SettingsItem {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly description: string;
  readonly values?: string[];

  /**
   * Formats the current value from config into a display string.
   *
   * @param config The current GitboxConfig.
   * @returns The formatted display string, or undefined if not applicable.
   */
  abstract format(config: GitboxConfig): string | undefined;

  /**
   * Validates and writes a new value. Returns a partial config to persist.
   *
   * @param config The current GitboxConfig.
   * @param value The display-value string from the user.
   * @returns A ValidationResult with the config patch.
   */
  abstract setConfig(config: GitboxConfig, value: string): ValidationResult;

  /**
   * Returns the default value for this setting (used by config generation).
   *
   * @param defaults The default GitboxConfig.
   * @returns A partial config with the default value.
   */
  abstract reset(defaults: GitboxConfig): Partial<GitboxConfig>;

  /**
   * Returns the default value for this setting.
   *
   * @returns The default value, or undefined if not applicable.
   */
  getDefault(): unknown {
    return undefined;
  }
}
