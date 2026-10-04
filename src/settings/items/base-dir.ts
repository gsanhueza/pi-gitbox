import { ScalarSettingsItem } from "./scalar";

/**
 * Default value for the baseDir setting.
 */
export const BASE_DIR_DEFAULT = "/home/gabriel/.pi/agent/gitbox";

/**
 * String scalar setting: base directory for gitboxes.
 */
export class BaseDirSettingsItem extends ScalarSettingsItem<string> {
  constructor() {
    super({
      id: "baseDir",
      label: "Base directory",
      description: "Base directory for gitboxes",
      default: BASE_DIR_DEFAULT,
    });
  }
}
