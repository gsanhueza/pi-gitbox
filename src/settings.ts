import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GitboxConfig } from "./config-types";
import {
  ALLOWED_PATHS,
  BYPASS_GITBOX,
  BYPASS_PATHS,
  DELETE_ON_EXIT,
  GITBOX_BASEDIR,
  GITBOX_STATUSBAR,
  IMPERSONATE_DIRS,
  STATUS_KEY,
} from "./defaults";

/**
 * Manages Gitbox configuration: defaults, user settings, validation,
 * caching, and persistence to ~/.pi/agent/settings.json.
 */
class Settings {
  private cachedConfig: GitboxConfig | null = null;
  private cachedErrors: string[] = [];

  /**
   * Manages Gitbox configuration: defaults, user settings, validation,
   * caching, and persistence to ~/.pi/agent/settings.json.
   *
   * @internal Use the exported `settings` singleton instead.
   */
  constructor(
    private readonly path: string = join(getAgentDir(), "settings.json"),
  ) {}

  /**
   * Retrieves the default configuration object.
   *
   * @returns The default configuration.
   */
  private getDefaultConfig(): GitboxConfig {
    return {
      baseDir: GITBOX_BASEDIR,
      statusBar: GITBOX_STATUSBAR,
      deleteOnExit: DELETE_ON_EXIT,
      impersonateDirs: IMPERSONATE_DIRS,
      bypassGitbox: BYPASS_GITBOX,
      bypassPaths: BYPASS_PATHS,
      allowedPaths: ALLOWED_PATHS,
    };
  }

  /**
   * Resolves the final config, merging user settings with built-in defaults,
   * validating, and caching the result.
   */
  async getConfig(): Promise<{ config: GitboxConfig; errors: string[] }> {
    if (this.cachedConfig)
      return { config: this.cachedConfig, errors: this.cachedErrors };

    const defaults = this.getDefaultConfig();
    const userSettings = await this.readExtensionSettings();

    this.cachedConfig = { ...defaults, ...userSettings };

    return { config: this.cachedConfig, errors: this.cachedErrors };
  }

  /**
   * Writes a partial GitboxConfig, invalidating the cache.
   */
  async setConfig(partial: Partial<GitboxConfig>): Promise<void> {
    await this.writeExtensionSettings(partial);
    this.resetConfigCache();
  }

  /**
   * Resets the cached config, forcing a fresh read from disk on the next call.
   */
  resetConfigCache(): void {
    this.cachedConfig = null;
    this.cachedErrors = [];
  }

  /**
   * Reads ~/.pi/agent/settings.json and extracts the "gitbox" settings block.
   *
   * @returns The Gitbox settings object.
   */
  private async readExtensionSettings(): Promise<GitboxConfig> {
    const settings = await this.readSettings();
    return (settings[STATUS_KEY] || {}) as GitboxConfig;
  }

  /**
   * Writes a partial GitboxConfig to ~/.pi/agent/settings.json,
   * merging it with existing values.
   *
   * @param partial The partial GitboxConfig to write.
   */
  private async writeExtensionSettings(
    partial: Partial<GitboxConfig>,
  ): Promise<void> {
    const settings = await this.readSettings();
    const current = (settings[STATUS_KEY] as Record<string, unknown>) || {};
    settings[STATUS_KEY] = { ...current, ...partial };

    await this.writeSettings(settings);
  }

  /**
   * Reads and parses a JSON file.
   *
   * @returns The parsed JSON object, or an empty object on failure.
   */
  async readSettings(): Promise<Record<string, unknown>> {
    try {
      const raw = await readFile(this.path, "utf-8");
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  /**
   * Writes a JSON object to the file with 2-space indentation.
   *
   * @param data The object to serialize and write.
   */
  async writeSettings(data: Record<string, unknown>): Promise<void> {
    await writeFile(this.path, JSON.stringify(data, null, 2), "utf-8");
  }
}

/**
 * Shared singleton instance used across the extension.
 */
export const settings = new Settings();
