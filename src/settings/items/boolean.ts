import type { GitboxConfig } from "../../config-types";
import { ScalarSettingsItem } from "./scalar";

/**
 * Base class for boolean settings with On/Off toggle labels.
 */
export abstract class BooleanSettingsItem extends ScalarSettingsItem<boolean> {
  constructor() {
    super({
      id: "" as keyof GitboxConfig & string,
      label: "",
      description: "",
      default: false,
      toggle: ["On", "Off"],
    });
  }
}
