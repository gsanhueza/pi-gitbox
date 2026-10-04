import type { GitboxConfig } from "../../config/types";
import { ScalarSettingsItem } from "./scalar";

/**
 * Options for a boolean settings item.
 */
export interface BooleanSettingsOptions {
  /** Setting identifier (e.g. "bypassGitbox") */
  id: keyof GitboxConfig & string;
  /** Display label */
  label: string;
  /** Help text */
  description: string;
  /** Default value */
  default: boolean;
}

/**
 * Base class for boolean settings with On/Off toggle labels.
 *
 * Subclasses pass their options via `super()` in the constructor.
 *
 * @example
 * ```typescript
 * export class BypassGitboxSettingsItem extends BooleanSettingsItem {
 *   constructor() {
 *     super({
 *       id: "bypassGitbox",
 *       label: "Bypass impersonation",
 *       description: "Skip impersonation of gitignored paths",
 *       default: false,
 *     });
 *   }
 * }
 * ```
 */
export abstract class BooleanSettingsItem extends ScalarSettingsItem<boolean> {
  protected constructor(options: BooleanSettingsOptions) {
    super({
      ...options,
      toggle: ["On", "Off"],
    });
  }
}
