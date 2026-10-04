import type { Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { ConfirmDialog } from "./confirm";
import { InputDialog } from "./input";
import type { ConfirmDialogOptions, InputDialogOptions } from "./options";

/** `InputDialog` options minus the deps the factory injects. */
type InputOptions = Omit<InputDialogOptions, "theme" | "tui">;

/** `ConfirmDialog` options minus the deps the factory injects. */
type ConfirmOptions = Omit<ConfirmDialogOptions, "theme" | "tui">;

/**
 * Single factory for constructing dialogs. Holds `theme` and `tui` once
 * in the constructor so callers never thread the `{ theme, tui }` deps
 * tuple by hand.
 */
export class DialogFactory {
  /**
   * Creates the factory.
   *
   * @param theme Theme for the dialogs.
   * @param tui TUI instance for re-renders.
   */
  constructor(
    private readonly theme: Theme,
    private readonly tui: TUI,
  ) {}

  /**
   * Creates a framed text-input dialog: Enter commits, Esc cancels.
   *
   * @param options The dialog options (without theme/tui).
   * @returns The InputDialog.
   */
  input(options: InputOptions): InputDialog {
    return new InputDialog({ ...options, theme: this.theme, tui: this.tui });
  }

  /**
   * Creates a framed confirmation dialog with a two-option select list.
   *
   * @param options The dialog options (without theme/tui).
   * @returns The ConfirmDialog.
   */
  confirm(options: ConfirmOptions): ConfirmDialog {
    return new ConfirmDialog({
      ...options,
      theme: this.theme,
      tui: this.tui,
    });
  }

  /**
   * Creates a delete confirmation dialog.
   *
   * @param title Dialog title.
   * @param name The name of the entry being deleted.
   * @param onConfirm Callback when the user confirms.
   * @param onCancel Callback when the user cancels.
   * @returns The ConfirmDialog.
   */
  confirmDelete(
    title: string,
    name: string,
    onConfirm: () => void,
    onCancel: () => void,
  ): ConfirmDialog {
    return this.confirm({
      title,
      message: `Delete "${name}"?`,
      confirmLabel: "Delete",
      onConfirm,
      onCancel,
    });
  }
}
