import { vi } from "vitest";
import type { TUI } from "@earendil-works/pi-tui";

export function createMockTUI(): TUI {
  return { requestRender: vi.fn() } as unknown as TUI;
}

export function createMockTheme(): never {
  return {
    fg: (_color: string, text: string) => text,
    bold: (text: string) => text,
  } as never;
}
