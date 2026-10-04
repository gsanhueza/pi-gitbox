import { BooleanSettingsItem } from "./boolean";

/**
 * Default value for the deleteOnExit setting.
 */
export const DELETE_ON_EXIT_DEFAULT = false;

/**
 * Boolean setting: delete the gitbox when exiting Pi.
 */
export class DeleteOnExitSettingsItem extends BooleanSettingsItem {
  constructor() {
    super();
    this.options.id = "deleteOnExit";
    this.options.label = "Delete on exit";
    this.options.description = "When exiting Pi, delete the gitbox";
    this.options.default = DELETE_ON_EXIT_DEFAULT;
  }
}
