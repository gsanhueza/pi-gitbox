import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../../../src/ui/dialog/confirm";
import { createMockTUI, createMockTheme } from "../../mocks/tui";

const tui = createMockTUI();
const theme = createMockTheme();

describe("ConfirmDialog", () => {
  it("renders both confirm and cancel options", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const dialog = new ConfirmDialog({
      title: "Delete?",
      message: "Are you sure?",
      theme,
      tui,
      onConfirm,
      onCancel,
    });
    const lines = dialog.render(80);
    const text = lines.join("\n");
    expect(text).toContain("Confirm");
    expect(text).toContain("Cancel");
  });

  it("fires onConfirm when onSelect triggers confirm", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const dialog = new ConfirmDialog({
      title: "Delete?",
      message: "Are you sure?",
      theme,
      tui,
      onConfirm,
      onCancel,
    });
    // Access the private SelectList via internals
    const list = (
      dialog as unknown as {
        list: { onSelect?: (item: { value: string }) => void };
      }
    ).list;
    list.onSelect?.({ value: "confirm" });
    expect(onConfirm).toHaveBeenCalled();
  });

  it("fires onCancel when onSelect triggers cancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const dialog = new ConfirmDialog({
      title: "Delete?",
      message: "Are you sure?",
      theme,
      tui,
      onConfirm,
      onCancel,
    });
    const list = (
      dialog as unknown as {
        list: { onSelect?: (item: { value: string }) => void };
      }
    ).list;
    list.onSelect?.({ value: "cancel" });
    expect(onCancel).toHaveBeenCalled();
  });

  it("fires onCancel when onCancel triggers", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const dialog = new ConfirmDialog({
      title: "Delete?",
      message: "Are you sure?",
      theme,
      tui,
      onConfirm,
      onCancel,
    });
    const list = (dialog as unknown as { list: { onCancel?: () => void } })
      .list;
    list.onCancel?.();
    expect(onCancel).toHaveBeenCalled();
  });
});
