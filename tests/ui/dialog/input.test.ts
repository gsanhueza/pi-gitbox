import { describe, expect, it, vi } from "vitest";
import { InputDialog } from "../../../src/ui/dialog/input";
import type { TUI } from "@earendil-works/pi-tui";

const tui = { requestRender: vi.fn() } as unknown as TUI;

const theme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => text,
} as never;

describe("InputDialog", () => {
  it("renders with the initial value and placeholder", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const dialog = new InputDialog({
      title: "Add path",
      message: "Path to allow:",
      theme,
      tui,
      initialValue: "/default",
      placeholder: "/path/to/dir",
      onSubmit,
      onCancel,
    });
    const lines = dialog.render(80);
    expect(lines.some((l) => l.includes("/default"))).toBe(true);
    expect(lines.some((l) => l.includes("/path/to/dir"))).toBe(true);
  });

  it("calls onSubmit with validated value on Enter", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const dialog = new InputDialog({
      title: "Add path",
      message: "Path to allow:",
      theme,
      tui,
      validate: (raw: string) => (raw.trim() ? raw.trim() : null),
      onSubmit,
      onCancel,
    });
    // The Input component has an onSubmit callback — trigger it directly
    (
      dialog as unknown as { input: { onSubmit?: (value: string) => void } }
    ).input.onSubmit?.("  /my/path  ");
    expect(onSubmit).toHaveBeenCalledWith("/my/path");
  });

  it("calls setError (shows error text) when validation rejects", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const dialog = new InputDialog({
      title: "Add path",
      message: "Path to allow:",
      theme,
      tui,
      validate: (raw: string) => (raw.trim() ? raw.trim() : null),
      errorMessage: "Path is empty",
      onSubmit,
      onCancel,
    });
    // Trigger submit with empty value — should call setError
    (
      dialog as unknown as { input: { onSubmit?: (value: string) => void } }
    ).input.onSubmit?.("  ");
    const lines = dialog.render(80);
    expect(lines.some((l) => l.includes("Path is empty"))).toBe(true);
  });

  it("calls onCancel when onEscape fires", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const dialog = new InputDialog({
      title: "Add path",
      message: "Path to allow:",
      theme,
      tui,
      onSubmit,
      onCancel,
    });
    (
      dialog as unknown as { input: { onEscape?: () => void } }
    ).input.onEscape?.();
    expect(onCancel).toHaveBeenCalled();
  });
});
