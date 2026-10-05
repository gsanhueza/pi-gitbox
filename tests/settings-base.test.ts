import { describe, expect, it } from "vitest";
import { SettingsItem } from "../src/settings/base";
import type { GitboxConfig } from "../src/config/types";

/**
 * Minimal concrete implementation of SettingsItem for testing.
 */
class TestSettingsItem extends SettingsItem {
  readonly id = "test";
  readonly label = "Test";
  readonly description = "A test setting";

  format(_config: GitboxConfig): string | undefined {
    return "test-value";
  }

  setConfig(
    _config: GitboxConfig,
    _value: string,
  ): import("../src/settings/base").ValidationResult {
    return { valid: true };
  }

  reset(_defaults: GitboxConfig): Partial<GitboxConfig> {
    return {};
  }
}

describe("SettingsItem (base class)", () => {
  it("returns undefined from getDefault()", () => {
    const item = new TestSettingsItem();
    expect(item.getDefault()).toBeUndefined();
  });

  it("has the correct id", () => {
    const item = new TestSettingsItem();
    expect(item.id).toBe("test");
  });

  it("has the correct label", () => {
    const item = new TestSettingsItem();
    expect(item.label).toBe("Test");
  });

  it("has the correct description", () => {
    const item = new TestSettingsItem();
    expect(item.description).toBe("A test setting");
  });
});
