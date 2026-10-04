import type { GitboxConfig } from "../../config/types";
import { SettingsItem, type ValidationResult } from "../base";

/**
 * Options for a scalar setting (enum, numeric, boolean, string).
 */
interface ScalarOptions<T> {
  id: keyof GitboxConfig & string;
  label: string;
  description: string;
  default: T;
  /** Enum label map: config value → display label */
  labels?: Record<string, string>;
  /** Numeric range */
  min?: number;
  max?: number;
  /** Boolean toggle labels: [on, off] */
  toggle?: [string, string];
}

/**
 * Base class for scalar settings. Handles the four abstract methods
 * with sensible defaults based on the options:
 *
 * - **Enum** (`labels`): format → label lookup, setConfig → invert map
 * - **Numeric** (number default): format → String, setConfig → Number, validate → range check
 * - **Boolean** (`toggle`): format → "On"/"Off", setConfig → value === onLabel
 * - **String** (fallback): format → String, setConfig → passthrough
 *
 * Auto-registers itself in `SettingsRegistry.ITEMS` at construction time.
 */
export abstract class ScalarSettingsItem<T> extends SettingsItem {
  readonly options: ScalarOptions<T>;

  readonly values: string[] | undefined;

  constructor(options: ScalarOptions<T>) {
    super();
    this.options = options;
    this.values = options.labels
      ? Object.values(options.labels)
      : options.toggle
        ? [...options.toggle]
        : undefined;
  }

  /**
   * The setting identifier (e.g. "statusBar", "baseDir").
   *
   * @returns The setting identifier.
   */
  get id(): keyof GitboxConfig & string {
    return this.options.id;
  }

  /**
   * The display label for this setting.
   *
   * @returns The display label.
   */
  get label(): string {
    return this.options.label;
  }

  /**
   * The description text for this setting.
   *
   * @returns The description text.
   */
  get description(): string {
    return this.options.description;
  }

  /**
   * @returns The default value for this setting.
   */
  getDefault(): T {
    return this.options.default;
  }

  /**
   * Formats the current config value for display.
   *
   * @param config The current GitboxConfig.
   * @returns The formatted display string, or undefined if unset.
   */
  format(config: GitboxConfig): string | undefined {
    const value = config[this.options.id];
    if (this.options.labels) {
      return this.options.labels[String(value)] ?? String(value);
    }
    if (this.options.toggle && typeof value === "boolean") {
      return value ? this.options.toggle[0] : this.options.toggle[1];
    }
    return String(value);
  }

  /**
   * Parses a display value string back into a config update.
   *
   * @param _config The current GitboxConfig (unused).
   * @param value The display-value string from the user.
   * @returns A ValidationResult with the config patch.
   */
  setConfig(_config: GitboxConfig, value: string): ValidationResult {
    if (this.options.labels) {
      const inverted = this.invertLabels(this.options.labels);
      const parsed = inverted[value] as string | undefined;
      if (parsed === undefined) {
        return {
          valid: false,
          errors: [`Invalid ${this.id}: "${value}"`],
        };
      }
      const finalValue =
        typeof this.options.default === "number"
          ? Number(parsed)
          : (parsed as T);
      return {
        valid: true,
        config: { [this.options.id]: finalValue } as Partial<GitboxConfig>,
      };
    }
    if (this.options.toggle) {
      return {
        valid: true,
        config: {
          [this.options.id]: value === this.options.toggle[0],
        } as Partial<GitboxConfig>,
      };
    }
    if (typeof this.options.default === "number") {
      return {
        valid: true,
        config: {
          [this.options.id]: Number(value),
        } as Partial<GitboxConfig>,
      };
    }
    return {
      valid: true,
      config: { [this.options.id]: value as T } as Partial<GitboxConfig>,
    };
  }

  /**
   * Returns the default value for this setting.
   *
   * @param defaults The default GitboxConfig.
   * @returns A partial config with the default value.
   */
  reset(_defaults: GitboxConfig): Partial<GitboxConfig> {
    return { [this.options.id]: this.options.default } as Partial<GitboxConfig>;
  }

  /**
   * Inverts a label map, swapping keys and values.
   *
   * @param obj The label map to invert.
   * @returns The inverted map.
   */
  private invertLabels<K extends string>(
    obj: Record<K, string>,
  ): Record<string, K> {
    const result = {} as Record<string, K>;
    for (const key in obj) {
      result[obj[key]] = key;
    }
    return result;
  }
}
