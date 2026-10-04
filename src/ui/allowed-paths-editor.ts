import {
  getSettingsListTheme,
  type Theme,
} from "@earendil-works/pi-coding-agent";
import type { Component, SettingItem, TUI } from "@earendil-works/pi-tui";
import { BaseDialog } from "./dialog/base";
import { DialogFactory } from "./dialog/factory";
import { ResettableSettingsList } from "./resettable-settings-list";

/**
 * Options for the {@link AllowedPathsEditor}.
 */
export interface AllowedPathsEditorOptions {
  /** TUI instance, used to request re-renders after async persists. */
  tui: TUI;
  /** Theme for dialogs (from the ctx.ui.custom factory). */
  theme: Theme;
  /**
   * Loads the current allowedPaths array from the source of truth.
   * Called when the editor opens and after every persisted change, so
   * the list always reflects the actual configuration.
   */
  loadPaths: () => Promise<string[]>;
  /**
   * Persists a new allowedPaths array (and re-initializes the extension
   * so the new configuration takes effect immediately).
   */
  onChanged: (next: string[]) => Promise<void>;
  /** Closes the editor (called on Esc in the path list). */
  done: () => void;
}

/**
 * Drill-down editor for the `allowedPaths` setting: a SettingsList of the
 * current paths with add (`a`), delete (`d`, with confirmation) and edit
 * (Enter, via an input dialog) support.
 *
 * Every mutation is persisted immediately through
 * {@link AllowedPathsEditorOptions.onChanged} and the list is reloaded
 * from {@link AllowedPathsEditorOptions.loadPaths}, so the component
 * instance held by the parent TUI stays valid and never drifts from the
 * persisted configuration.
 */
export class AllowedPathsEditor implements Component {
  private readonly options: AllowedPathsEditorOptions;
  private readonly dialogs: DialogFactory;
  private readonly list: ResettableSettingsList;
  /** The currently open add/delete dialog, when one is up: input/render
   * delegate to it until it is cleared via {@link closeDialog}. */
  private activeDialog: BaseDialog | undefined;
  /** Working copy of the paths, reloaded from the source of truth after
   * every change. */
  private paths: string[] = [];
  /** Whether the initial async load has completed. */
  private ready = false;
  private isFocused = false;

  /**
   * Creates the editor. Path loading happens asynchronously; the list
   * renders a loading placeholder until it completes.
   *
   * @param options The editor options.
   */
  constructor(options: AllowedPathsEditorOptions) {
    this.options = options;
    this.dialogs = new DialogFactory(options.theme, options.tui);
    this.list = new ResettableSettingsList(
      [],
      1,
      getSettingsListTheme(),
      // Edits commit themselves through the row submenu; nothing to cycle
      () => {},
      options.done,
      // No reset inside the editor — `r` is a no-op here
      () => {},
      options.tui,
      {
        onAdd: () => this.beginAdd(),
        onDelete: (id) => this.beginDelete(id),
        emptyHint: "  Press (a) to add a path · Esc to cancel",
        showResetHint: false,
      },
    );
    void this.reload();
  }

  // -- Component ------------------------------------------------------------

  /**
   * Invalidates cached render state.
   *
   * @returns Nothing.
   */
  invalidate(): void {
    this.list.invalidate();
    this.activeDialog?.invalidate();
  }

  /**
   * Handles input: the open add/delete dialog takes precedence, otherwise
   * the path list (which itself delegates to any open row edit dialog).
   * Input is ignored until the initial load has completed.
   *
   * @param data The input data string.
   * @returns Nothing.
   */
  handleInput(data: string): void {
    if (!this.ready) return;
    if (this.activeDialog) {
      this.activeDialog.handleInput(data);
      return;
    }
    this.list.handleInput(data);
  }

  /**
   * Renders the open dialog, the loading placeholder, or the path list.
   *
   * @param width The available terminal width.
   * @returns An array of rendered text lines.
   */
  render(width: number): string[] {
    if (this.activeDialog) return this.activeDialog.render(width);
    if (!this.ready) return ["  Loading..."];
    return this.list.render(width);
  }

  // -- Focusable ------------------------------------------------------------

  /**
   * Whether the editor is focused.
   *
   * @returns True if focused.
   */
  get focused(): boolean {
    return this.isFocused;
  }

  /**
   * Sets focus, forwarding to the open dialog.
   *
   * @param value The new focus state.
   * @returns Nothing.
   */
  set focused(value: boolean) {
    this.isFocused = value;
    if (this.activeDialog) this.activeDialog.focused = value;
  }

  // -- internals ------------------------------------------------------------

  /**
   * Reloads the paths from the source of truth and rebuilds the list
   * in-place.
   *
   * @returns Nothing.
   */
  private async reload(): Promise<void> {
    this.paths = await this.options.loadPaths();
    this.list.setItems(this.buildItems());
    this.ready = true;
    this.options.tui.requestRender();
  }

  /**
   * Builds one list row per path. The path doubles as the row id
   * (duplicates are rejected on add/edit, so ids stay unique).
   *
   * @returns The array of SettingItem objects.
   */
  private buildItems(): SettingItem[] {
    return this.paths.map((path) => ({
      id: path,
      label: path,
      currentValue: "",
      submenu: (_currentValue, done) => this.beginEdit(path, done),
    }));
  }

  /**
   * Opens the add dialog. Submitting an invalid (empty or duplicate) path
   * shows an error inside the dialog instead of committing.
   *
   * @returns Nothing.
   */
  private beginAdd(): void {
    this.openDialog(
      this.dialogs.input({
        title: "Add path",
        message: "Path to always allow:",
        placeholder: "/path/to/dir",
        validate: (raw) => this.validatePath(raw),
        errorMessage: "Path is empty or already in the list",
        onSubmit: (value) => {
          this.closeDialog();
          void this.applyChange([...this.paths, value]);
        },
        onCancel: () => this.closeDialog(),
      }),
    );
  }

  /**
   * Opens the edit dialog for a path (opened via Enter on a row, through
   * the row's `submenu` callback). The containing SettingsList renders
   * the dialog and delegates input to it until `done()` is called.
   *
   * @param path The path being edited.
   * @param done The submenu close callback.
   * @returns The edit dialog component.
   */
  private beginEdit(
    path: string,
    done: (selectedValue?: string) => void,
  ): Component {
    const dialog = this.dialogs.input({
      title: "Edit path",
      message: path,
      initialValue: path,
      validate: (raw) => this.validatePath(raw, path),
      errorMessage: "Path is empty or already in the list",
      onSubmit: (value) => {
        done();
        void this.applyChange(this.paths.map((p) => (p === path ? value : p)));
      },
      onCancel: () => done(),
    });
    dialog.focused = true;
    return dialog;
  }

  /**
   * Opens the delete confirmation dialog for a path.
   *
   * @param id The id of the path to delete.
   * @returns Nothing.
   */
  private beginDelete(id: string): void {
    this.openDialog(
      this.dialogs.confirmDelete(
        "Delete path",
        id,
        () => {
          this.closeDialog();
          void this.applyChange(this.paths.filter((p) => p !== id));
        },
        () => this.closeDialog(),
      ),
    );
  }

  /**
   * Validates a user-provided path: trims whitespace, rejects empty
   * values and duplicates (comparing against every path except `except`,
   * so editing a path to itself is allowed).
   *
   * @param raw The raw input value.
   * @param except Optional path excluded from the duplicate check.
   * @returns The trimmed path, or null when rejected.
   */
  private validatePath(raw: string, except?: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (this.paths.some((p) => p !== except && p === trimmed)) return null;
    return trimmed;
  }

  /**
   * Persists a new paths array via `onChanged`, then reloads the list
   * from the source of truth to reflect the new state.
   *
   * @param next The new paths array.
   * @returns Nothing.
   */
  private async applyChange(next: string[]): Promise<void> {
    await this.options.onChanged(next);
    await this.reload();
  }

  /**
   * Opens a modal add/delete dialog: input/render delegate to it until
   * {@link closeDialog}.
   *
   * @param dialog The dialog to display.
   * @returns Nothing.
   */
  private openDialog(dialog: BaseDialog): void {
    this.activeDialog = dialog;
    dialog.focused = this.isFocused;
    this.options.tui.requestRender();
  }

  /**
   * Closes the open add/delete dialog and returns to the list.
   *
   * @returns Nothing.
   */
  private closeDialog(): void {
    this.activeDialog = undefined;
    this.options.tui.requestRender();
  }
}
