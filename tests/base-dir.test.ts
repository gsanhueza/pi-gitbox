import { describe, expect, it, beforeEach } from "vitest";
import { BaseDirSettingsItem } from "../src/settings/items/base-dir";
import { GITBOX_BASEDIR, TEMPORAL_GITBOX } from "../src/config/defaults";
import type { GitboxConfig } from "../src/config/types";

describe("BaseDirSettingsItem", () => {
  let item: BaseDirSettingsItem;

  beforeEach(() => {
    item = new BaseDirSettingsItem();
  });

  it("has the correct id", () => {
    expect(item.id).toBe("baseDir");
  });

  it("has the correct label", () => {
    expect(item.label).toBe("Gitbox location");
  });

  describe("format", () => {
    it('returns "Agent directory" for GITBOX_BASEDIR', () => {
      const config: GitboxConfig = {
        baseDir: GITBOX_BASEDIR,
        statusBar: false,
        deleteOnExit: false,
        impersonateDirs: false,
        bypassGitbox: false,
        bypassPaths: false,
        allowedPaths: [],
        systemNotifications: "off",
      };
      expect(item.format(config)).toBe("Agent directory");
    });

    it('returns "Temporal folder" for TEMPORAL_GITBOX', () => {
      const config: GitboxConfig = {
        baseDir: TEMPORAL_GITBOX,
        statusBar: false,
        deleteOnExit: false,
        impersonateDirs: false,
        bypassGitbox: false,
        bypassPaths: false,
        allowedPaths: [],
        systemNotifications: "off",
      };
      expect(item.format(config)).toBe("Temporal folder");
    });

    it('returns "Custom path (<path>)" for unknown values', () => {
      const config: GitboxConfig = {
        baseDir: "/custom/path",
        statusBar: false,
        deleteOnExit: false,
        impersonateDirs: false,
        bypassGitbox: false,
        bypassPaths: false,
        allowedPaths: [],
        systemNotifications: "off",
      };
      expect(item.format(config)).toBe("Custom path (/custom/path)");
    });

    it("returns undefined when baseDir is undefined", () => {
      const config: GitboxConfig = {
        baseDir: undefined as unknown as string,
        statusBar: false,
        deleteOnExit: false,
        impersonateDirs: false,
        bypassGitbox: false,
        bypassPaths: false,
        allowedPaths: [],
        systemNotifications: "off",
      };
      expect(item.format(config)).toBeUndefined();
    });

    it("returns undefined when baseDir is null", () => {
      const config: GitboxConfig = {
        baseDir: null as unknown as string,
        statusBar: false,
        deleteOnExit: false,
        impersonateDirs: false,
        bypassGitbox: false,
        bypassPaths: false,
        allowedPaths: [],
        systemNotifications: "off",
      };
      expect(item.format(config)).toBeUndefined();
    });
  });
});
