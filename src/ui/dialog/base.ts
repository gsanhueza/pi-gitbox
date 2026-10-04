import { DynamicBorder, type Theme } from "@earendil-works/pi-coding-agent";
import type { Component, Keybinding, TUI } from "@earendil-works/pi-tui";
import {
  Container,
  getKeybindings,
  Spacer,
  Text,
} from "@earendil-works/pi-tui";

/**
 * Base dialog class encapsulating the shared Component plumbing (framed
 * container, input delegation, themes) so concrete dialogs only declare
 * their body and their input target — they don't repeat the
 * `invalidate`/`render`/`handleInput` delegation code.
 */
export abstract class BaseDialog {
  protected theme: Theme;
  protected tui: TUI;
  /** The framed container every concrete dialog renders into. */
  private readonly frame = new Container();

  /**
   * Creates the dialog.
   *
   * @param theme Theme for the frame and text colors.
   * @param tui TUI instance for re-renders.
   */
  constructor(theme: Theme, tui: TUI) {
    this.theme = theme;
    this.tui = tui;
  }

  // -- Component -------------------------------------------------------------

  /**
   * Invalidates cached render state of the framed container.
   *
   * @returns Nothing.
   */
  invalidate(): void {
    this.frame.invalidate();
  }

  /**
   * Routes input to the concrete dialog's interactive child.
   *
   * @param data The input data string.
   * @returns Nothing.
   */
  handleInput(data: string): void {
    this.inputTarget.handleInput(data);
    this.tui.requestRender();
  }

  /**
   * Renders the framed dialog.
   *
   * @param width The available terminal width.
   * @returns An array of rendered text lines.
   */
  render(width: number): string[] {
    return this.frame.render(width);
  }

  // -- Focusable -------------------------------------------------------------

  private isFocused = false;

  /**
   * Whether the dialog is focused.
   *
   * @returns True if focused.
   */
  get focused(): boolean {
    return this.isFocused;
  }

  /**
   * Sets focus, forwarding to the interactive child when it manages
   * focus (e.g. the text `Input`); plain select lists don't have a
   * `focused` flag.
   *
   * @param value The new focus state.
   * @returns Nothing.
   */
  set focused(value: boolean) {
    this.isFocused = value;
    const target = this.inputTarget as { focused?: boolean };
    if ("focused" in target) target.focused = value;
  }

  // -- shared utilities ------------------------------------------------------

  /**
   * The component keystrokes are routed to (e.g. the text input or the
   * option list).
   */
  protected abstract get inputTarget(): {
    handleInput(data: string): void;
  };

  /**
   * Builds the framed chrome (borders, title, footer) around `body`.
   * Concrete dialogs call this once from their constructor, after
   * assembling the body.
   *
   * @param title The dialog title.
   * @param body The body components.
   * @param footer Optional footer hint text.
   * @returns Nothing.
   */
  protected setFrame(title: string, body: Component[], footer?: string): void {
    this.frame.addChild(
      new DynamicBorder((text) => this.theme.fg("accent", text)),
    );
    this.frame.addChild(
      new Text(this.theme.fg("accent", this.theme.bold(title)), 1, 0),
    );
    for (const child of body) this.frame.addChild(child);
    if (footer) {
      this.frame.addChild(new Spacer(1));
      this.frame.addChild(new Text(this.theme.fg("dim", footer), 1, 0));
    }
    this.frame.addChild(
      new DynamicBorder((text) => this.theme.fg("accent", text)),
    );
  }

  /**
   * Builds the SelectList theme from the active theme.
   *
   * @returns A SelectListTheme.
   */
  protected selectListTheme(): {
    selectedPrefix: (text: string) => string;
    selectedText: (text: string) => string;
    description: (text: string) => string;
    scrollInfo: (text: string) => string;
    noMatch: (text: string) => string;
  } {
    return {
      selectedPrefix: (text) => this.theme.fg("accent", text),
      selectedText: (text) => this.theme.fg("accent", text),
      description: (text) => this.theme.fg("muted", text),
      scrollInfo: (text) => this.theme.fg("dim", text),
      noMatch: (text) => this.theme.fg("warning", text),
    };
  }

  /**
   * Renders a key/action hint pair.
   *
   * @param action The keybinding action.
   * @param description The action description.
   * @returns The formatted hint string.
   */
  protected hint(action: Keybinding, description: string): string {
    const keys = getKeybindings().getKeys(action).join("/");
    return (
      this.theme.fg("dim", keys) + this.theme.fg("muted", ` ${description}`)
    );
  }

  /**
   * Footer hint for text-input dialogs.
   *
   * @returns The formatted footer string.
   */
  protected inputFooter(): string {
    return `${this.hint("tui.select.confirm", "save")} • ${this.hint("tui.select.cancel", "cancel")}`;
  }

  /**
   * Footer hint for select-list dialogs.
   *
   * @returns The formatted footer string.
   */
  protected selectFooter(): string {
    return `${this.hint("tui.select.confirm", "select")} • ${this.hint("tui.select.cancel", "cancel")}`;
  }
}
