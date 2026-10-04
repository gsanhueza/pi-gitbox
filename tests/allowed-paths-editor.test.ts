import { describe, expect, it, vi } from "vitest";
import {
  getSettingsListTheme,
  initTheme,
} from "@earendil-works/pi-coding-agent";
import { ResettableSettingsList } from "../src/ui/resettable-settings-list";
import type { TUI } from "@earendil-works/pi-tui";
import { AllowedPathsEditor } from "../src/ui/allowed-paths-editor";

initTheme({} as never);

const tui = { requestRender: vi.fn() } as unknown as TUI;

function strip(line: string): string {
  // eslint-disable-next-line no-control-regex
  return line.replace(/\x1b\[[0-9;]*m/g, "");
}

function makeEditor(
  paths: string[],
  onChanged?: (next: string[]) => Promise<void>,
) {
  // Simulates the persisted configuration: the loader always reads the
  // current value, and onChanged (persistence) updates it.
  let stored = [...paths];
  const loadPaths = vi.fn().mockImplementation(async () => [...stored]);
  const persist =
    onChanged ??
    (async (next: string[]) => {
      stored = [...next];
    });
  const editor = new AllowedPathsEditor({
    tui,
    theme: {
      fg: (_c: string, t: string) => t,
      bold: (t: string) => t,
    } as never,
    loadPaths,
    onChanged: persist,
    done: vi.fn(),
  });
  return { editor, loadPaths };
}

async function waitReady(
  editor: AllowedPathsEditor,
  text: string,
): Promise<string[]> {
  await vi.waitFor(() =>
    expect(strip(editor.render(80).join("\n"))).toContain(text),
  );
  return editor.render(80).map(strip);
}

describe("AllowedPathsEditor", () => {
  it("shows the a/d hint below a non-empty list", async () => {
    const { editor } = makeEditor(["/a", "/b"]);
    const lines = await waitReady(editor, "/a");
    const last = lines[lines.length - 1];
    expect(last).toContain("a add");
    expect(last).toContain("d remove");
    // The editor has no reset action — its hint must not advertise `r`
    expect(last).not.toContain("r reset to default");
  });

  it("shows a loading placeholder until paths are loaded", () => {
    const { editor } = makeEditor(["/a"]);
    expect(editor.render(80)).toEqual(["  Loading..."]);
  });

  it("keeps the a/d hint when nested inside the main settings list", async () => {
    const { editor } = makeEditor(["/a"]);
    await waitReady(editor, "/a");
    const main = new ResettableSettingsList(
      [
        {
          id: "allowedPaths",
          label: "Allowed paths",
          currentValue: "1 path(s)",
        },
      ],
      1,
      getSettingsListTheme(),
      () => {},
      () => {},
      () => {},
      tui,
    );
    // Simulate the main list opening the editor as a submenu
    (main as unknown as { submenuComponent: unknown }).submenuComponent =
      editor;
    const lines = main.render(80).map(strip);
    const last = lines[lines.length - 1];
    expect(last).toContain("a add");
    expect(last).toContain("d remove");
  });

  it("persists an added path and shows it in the list", async () => {
    const { editor, loadPaths } = makeEditor(["/a"]);
    await waitReady(editor, "/a");
    editor.handleInput("a");
    // Dialog is open: type the path and submit
    editor.handleInput("/b");
    editor.handleInput("\r");
    await vi.waitFor(() => expect(loadPaths).toHaveBeenCalledTimes(2));
    const lines = await waitReady(editor, "/b");
    expect(lines.some((l) => l.includes("/b"))).toBe(true);
  });

  it("persists a deleted path and removes it from the list", async () => {
    const { editor, loadPaths } = makeEditor(["/a", "/b"]);
    await waitReady(editor, "/a");
    editor.handleInput("d");
    // Confirmation dialog: Delete is the first option — confirm with Enter
    editor.handleInput("\r");
    await vi.waitFor(() => expect(loadPaths).toHaveBeenCalledTimes(2));
    const lines = await waitReady(editor, "/b");
    expect(lines.some((l) => l.includes("/a"))).toBe(false);
    expect(lines.some((l) => l.includes("/b"))).toBe(true);
  });

  it("reloads paths from the source of truth when reopened", async () => {
    // First open: add a path through the editor
    const { editor } = makeEditor(["/a"]);
    await waitReady(editor, "/a");
    editor.handleInput("a");
    editor.handleInput("/b");
    editor.handleInput("\r");
    await vi.waitFor(() =>
      expect(editor.render(80).map(strip).join("\n")).toContain("/b"),
    );

    // Re-entering the editor creates a new instance that loads the
    // persisted paths — it must include the recently added one
    const reopened = makeEditor(["/a", "/b"]).editor;
    const lines = await waitReady(reopened, "/b");
    expect(lines.some((l) => l.includes("/a"))).toBe(true);
    expect(lines.some((l) => l.includes("/b"))).toBe(true);
  });
});
