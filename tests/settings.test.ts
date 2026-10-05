import { describe, expect, it, beforeEach } from "vitest";
import { writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Settings } from "../src/settings";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "pi-gitbox-settings-"));
});

describe("Settings", () => {
  describe("setConfig", () => {
    it("writes a partial config and resets cache", async () => {
      const path = join(tmpDir, "settings.json");
      const settings = new Settings(path);

      // Initial state: empty file
      await writeFile(path, "{}", "utf-8");

      // Set a config value
      await settings.setConfig({ statusBar: true });

      // Verify it was written
      const { config } = await settings.getConfig();
      expect(config.statusBar).toBe(true);
    });

    it("merges multiple setConfig calls", async () => {
      const path = join(tmpDir, "settings.json");
      const settings = new Settings(path);

      await writeFile(path, "{}", "utf-8");

      await settings.setConfig({ statusBar: true });
      await settings.setConfig({ deleteOnExit: true });

      const { config } = await settings.getConfig();
      expect(config.statusBar).toBe(true);
      expect(config.deleteOnExit).toBe(true);
    });
  });

  describe("getItem", () => {
    it("returns the SettingsItem for a known id", () => {
      const settings = new Settings(join(tmpDir, "settings.json"));
      const item = settings.getItem("statusBar");
      expect(item).toBeDefined();
      expect(item?.id).toBe("statusBar");
    });

    it("returns undefined for unknown id", () => {
      const settings = new Settings(join(tmpDir, "settings.json"));
      expect(settings.getItem("nonexistent")).toBeUndefined();
    });
  });

  describe("resetKeys", () => {
    it("deletes specified keys from persisted settings", async () => {
      const path = join(tmpDir, "settings.json");
      const settings = new Settings(path);

      await writeFile(
        path,
        JSON.stringify({
          gitbox: { statusBar: true, deleteOnExit: true, baseDir: "/custom" },
        }),
        "utf-8",
      );

      // Reset statusBar and baseDir
      await settings.resetKeys(["statusBar", "baseDir"]);

      // They should be gone from disk
      const { config } = await settings.getConfig();
      expect(config.statusBar).toBe(true); // falls back to default (true)
      expect(config.baseDir).not.toBe("/custom");
      // deleteOnExit should still be true
      expect(config.deleteOnExit).toBe(true);
    });

    it("resets cache after deleting keys", async () => {
      const path = join(tmpDir, "settings.json");
      const settings = new Settings(path);

      await writeFile(
        path,
        JSON.stringify({ gitbox: { statusBar: true } }),
        "utf-8",
      );

      // Get config (caches statusBar: true)
      const before = await settings.getConfig();
      expect(before.config.statusBar).toBe(true);

      // Reset the key
      await settings.resetKeys(["statusBar"]);

      // Cache should be invalidated and default used
      const after = await settings.getConfig();
      expect(after.config.statusBar).toBe(true); // default is true
    });
  });

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
