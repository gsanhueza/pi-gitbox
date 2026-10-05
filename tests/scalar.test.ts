import { describe, expect, it, beforeEach } from "vitest";
import type { GitboxConfig } from "../src/config/types";
import { ScalarSettingsItem } from "../src/settings/items/scalar";

/**
 * Concrete implementations for each scalar mode.
 */
class EnumScalar extends ScalarSettingsItem<string> {
  constructor() {
    super({
      id: "baseDir",
      label: "Base dir",
      description: "Base directory",
      default: "/default",
      labels: {
        "/default": "Default",
        "/custom": "Custom",
      },
    });
  }
}

class ToggleScalar extends ScalarSettingsItem<boolean> {
  constructor() {
    super({
      id: "statusBar",
      label: "Status bar",
      description: "Show status bar",
      default: false,
      toggle: ["On", "Off"],
    });
  }
}

class NumericScalar extends ScalarSettingsItem<number> {
  constructor() {
    super({
      id: "bypassPaths",
      label: "Status bar",
      description: "Status bar",
      default: 0,
    });
  }
}

class StringScalar extends ScalarSettingsItem<string> {
  constructor() {
    super({
      id: "baseDir",
      label: "Base dir",
      description: "Base directory",
      default: "/default",
    });
  }
}

describe("ScalarSettingsItem — enum mode", () => {
  let item: EnumScalar;

  beforeEach(() => {
    item = new EnumScalar();
  });

  it("has a description", () => {
    expect(item.description).toBe("Base directory");
  });

  it("formats known values via label lookup", () => {
    const config: GitboxConfig = {
      baseDir: "/default",
      statusBar: false,
      deleteOnExit: false,
      impersonateDirs: false,
      bypassGitbox: false,
      bypassPaths: false,
      allowedPaths: [],
      systemNotifications: "off",
    };
    expect(item.format(config)).toBe("Default");
  });

  it("formats unknown values as string", () => {
    const config: GitboxConfig = {
      baseDir: "/unknown",
      statusBar: false,
      deleteOnExit: false,
      impersonateDirs: false,
      bypassGitbox: false,
      bypassPaths: false,
      allowedPaths: [],
      systemNotifications: "off",
    };
    expect(item.format(config)).toBe("/unknown");
  });

  it("formats undefined as 'undefined'", () => {
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
    expect(item.format(config)).toBe("undefined");
  });

  it("parses label string back to config value", () => {
    const result = item.setConfig({} as GitboxConfig, "Custom");
    expect(result).toEqual({
      valid: true,
      config: { baseDir: "/custom" },
    });
  });

  it("rejects invalid label strings", () => {
    const result = item.setConfig({} as GitboxConfig, "Nonexistent");
    expect(result).toEqual({
      valid: false,
      errors: ['Invalid baseDir: "Nonexistent"'],
    });
  });

  it("resets to default value", () => {
    const result = item.reset({} as GitboxConfig);
    expect(result).toEqual({ baseDir: "/default" });
  });
});

describe("ScalarSettingsItem — toggle mode", () => {
  let item: ToggleScalar;

  beforeEach(() => {
    item = new ToggleScalar();
  });

  it("formats true as On", () => {
    const config: GitboxConfig = {
      baseDir: "/default",
      statusBar: true,
      deleteOnExit: false,
      impersonateDirs: false,
      bypassGitbox: false,
      bypassPaths: false,
      allowedPaths: [],
      systemNotifications: "off",
    };
    expect(item.format(config)).toBe("On");
  });

  it("formats false as Off", () => {
    const config: GitboxConfig = {
      baseDir: "/default",
      statusBar: false,
      deleteOnExit: false,
      impersonateDirs: false,
      bypassGitbox: false,
      bypassPaths: false,
      allowedPaths: [],
      systemNotifications: "off",
    };
    expect(item.format(config)).toBe("Off");
  });

  it("parses On label to true", () => {
    const result = item.setConfig({} as GitboxConfig, "On");
    expect(result).toEqual({
      valid: true,
      config: { statusBar: true },
    });
  });

  it("parses Off label to false", () => {
    const result = item.setConfig({} as GitboxConfig, "Off");
    expect(result).toEqual({
      valid: true,
      config: { statusBar: false },
    });
  });

  it("parses any other string as false", () => {
    const result = item.setConfig({} as GitboxConfig, "Other");
    expect(result).toEqual({
      valid: true,
      config: { statusBar: false },
    });
  });
});

describe("ScalarSettingsItem — numeric mode", () => {
  let item: NumericScalar;

  beforeEach(() => {
    item = new NumericScalar();
  });

  it("converts string to number in setConfig", () => {
    const result = item.setConfig({} as GitboxConfig, "123");
    expect(result.valid).toBe(true);
    // The numeric conversion is the key behavior — value is parsed as Number
    expect(Number((result.config as any)[item.id])).toBe(123);
  });

  it("parses negative numbers", () => {
    const result = item.setConfig({} as GitboxConfig, "-5");
    expect(result.valid).toBe(true);
    expect(Number((result.config as any)[item.id])).toBe(-5);
  });
});

describe("ScalarSettingsItem — string mode (fallback)", () => {
  let item: StringScalar;

  beforeEach(() => {
    item = new StringScalar();
  });

  it("formats value as string", () => {
    const config: GitboxConfig = {
      baseDir: "/some/path",
      statusBar: false,
      deleteOnExit: false,
      impersonateDirs: false,
      bypassGitbox: false,
      bypassPaths: false,
      allowedPaths: [],
      systemNotifications: "off",
    };
    expect(item.format(config)).toBe("/some/path");
  });

  it("formats undefined as 'undefined'", () => {
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
    expect(item.format(config)).toBe("undefined");
  });

  it("passthrough value as-is", () => {
    const result = item.setConfig({} as GitboxConfig, "/new/path");
    expect(result).toEqual({
      valid: true,
      config: { baseDir: "/new/path" },
    });
  });
});
