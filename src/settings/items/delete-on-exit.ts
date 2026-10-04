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
    super({
      id: "deleteOnExit",
      label: "Delete on exit",
      description: "When exiting Pi, delete the gitbox",
      default: DELETE_ON_EXIT_DEFAULT,
    });
  }
}
