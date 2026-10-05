import { describe, expect, it, beforeEach } from "vitest";
import { AllowedPathsSettingsItem } from "../src/settings/items/allowed-paths";
import type { GitboxConfig } from "../src/config/types";

describe("AllowedPathsSettingsItem", () => {
  let item: AllowedPathsSettingsItem;

  beforeEach(() => {
    item = new AllowedPathsSettingsItem();
  });

  it("has the correct id", () => {
    expect(item.id).toBe("allowedPaths");
  });

  it("has the correct label", () => {
    expect(item.label).toBe("Allowed paths");
  });

  it("has a description", () => {
    expect(item.description).toContain("Extra paths");
  });

  describe("format", () => {
    it('returns "None" when allowedPaths is empty', () => {
      const config: GitboxConfig = {
        baseDir: "",
        statusBar: false,
        deleteOnExit: false,
        impersonateDirs: false,
        bypassGitbox: false,
        bypassPaths: false,
        allowedPaths: [],
        systemNotifications: "off",
      };
      expect(item.format(config)).toBe("None");
    });

    it('returns "None" when allowedPaths is undefined', () => {
      const config: GitboxConfig = {
        baseDir: "",
        statusBar: false,
        deleteOnExit: false,
        impersonateDirs: false,
        bypassGitbox: false,
        bypassPaths: false,
        allowedPaths: undefined as unknown as string[],
        systemNotifications: "off",
      };
      expect(item.format(config)).toBe("None");
    });

    it("returns count when paths exist", () => {
      const config: GitboxConfig = {
        baseDir: "",
        statusBar: false,
        deleteOnExit: false,
        impersonateDirs: false,
        bypassGitbox: false,
        bypassPaths: false,
        allowedPaths: ["/path1", "/path2", "/path3"],
        systemNotifications: "off",
      };
      expect(item.format(config)).toBe("3 path(s)");
    });

    it("returns '1 path(s)' for a single path", () => {
      const config: GitboxConfig = {
        baseDir: "",
        statusBar: false,
        deleteOnExit: false,
        impersonateDirs: false,
        bypassGitbox: false,
        bypassPaths: false,
        allowedPaths: ["/single-path"],
        systemNotifications: "off",
      };
      expect(item.format(config)).toBe("1 path(s)");
    });
  });

  describe("setConfig", () => {
    it("returns valid true with no config change", () => {
      const result = item.setConfig({} as GitboxConfig, "any-value");
      expect(result).toEqual({ valid: true });
      expect(result.config).toBeUndefined();
    });
  });

  describe("reset", () => {
    it("returns allowedPaths as empty array", () => {
      const defaults: GitboxConfig = {
        baseDir: "/default",
        statusBar: true,
        deleteOnExit: false,
        impersonateDirs: false,
        bypassGitbox: false,
        bypassPaths: false,
        allowedPaths: ["/some-path"],
        systemNotifications: "on",
      };
      const result = item.reset(defaults);
      expect(result).toEqual({ allowedPaths: [] });
    });
  });

  describe("getDefault", () => {
    it("returns an empty array", () => {
      expect(item.getDefault()).toEqual([]);
    });
  });
});
