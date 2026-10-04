import type { Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";

/**
 * Options for the {@link ConfirmDialog}.
 */
export interface ConfirmDialogOptions {
  /** Theme for the frame and text colors. */
  theme: Theme;
  /** TUI instance for re-renders. */
  tui: TUI;
  /** Dialog title. */
  title: string;
  /** Message shown inside the dialog. */
  message: string;
  /** Label for the confirming option. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Invoked when the user confirms. */
  onConfirm: () => void;
  /** Invoked when the user cancels (Esc or Cancel option). */
  onCancel: () => void;
}

/**
 * Options for the {@link InputDialog}.
 */
export interface InputDialogOptions {
  /** Theme for the frame and text colors. */
  theme: Theme;
  /** TUI instance for re-renders. */
  tui: TUI;
  /** Dialog title. */
  title: string;
  /** Message shown above the input. */
  message: string;
  /** Example value shown dim below the message. */
  placeholder?: string;
  /** Pre-filled value. The cursor is placed at the end. */
  initialValue?: string;
  /** Returns the accepted value, or null to reject the input. */
  validate?: (raw: string) => string | null;
  /** Error message shown when `validate` rejects the value. */
  errorMessage?: string;
  /** Invoked with the validated value on Enter. */
  onSubmit: (value: string) => void;
  /** Invoked when the user cancels (Esc). */
  onCancel: () => void;
}
