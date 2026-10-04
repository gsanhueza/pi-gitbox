import { describe, expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Settings } from "../src/settings";

describe("Settings", () => {
  it("re-reads the file after resetConfigCache (external edits)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pi-gitbox-"));
    const path = join(dir, "settings.json");
    const settings = new Settings(path);

    // First read caches the (empty) gitbox block
    const before = await settings.getConfig();
    expect(before.config.allowedPaths).toEqual([]);

    // Simulate an external edit (another session or manual edit)
    await writeFile(
      path,
      JSON.stringify({ gitbox: { allowedPaths: ["/added/manually"] } }),
      "utf-8",
    );

    // Without invalidation the cached config is stale
    const stale = await settings.getConfig();
    expect(stale.config.allowedPaths).toEqual([]);

    // Dropping the cache picks up what is on disk
    settings.resetConfigCache();
    const fresh = await settings.getConfig();
    expect(fresh.config.allowedPaths).toEqual(["/added/manually"]);
  });
});
