import {
  BashToolCallEvent,
  ExtensionContext,
  isToolCallEventType,
  ToolCallEvent,
} from "@earendil-works/pi-coding-agent";
import { mkdir, rm } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { GitboxConfig, Status } from "./config-types";
import { Detector } from "./detector";
import { Impersonator } from "./impersonator";
import { Renderer } from "./renderer";
import { settings } from "./settings";

export class Gitbox {
  constructor(private readonly impersonator: Impersonator) {}

  async initialize(ctx: ExtensionContext) {
    await this.verifySettings(ctx);

    // Only create the gitbox folder if it makes sense
    const status = await this.getStatus();
    if (status === Status.AVAILABLE || status === Status.ENABLED) {
      await this.impersonator.initialize(ctx);
      await this.getOrCreate(ctx);
    }

    await Renderer.setStatus(ctx, status);
  }

  async shutdown(ctx: ExtensionContext) {
    const { config } = await settings.getConfig();
    const { deleteOnExit } = config;

    if (deleteOnExit) await this.removeGitbox(ctx);
  }

  /**
   * Determines if the event is a "bash" tool call
   * @param event The event
   * @returns True if "bash" event
   */
  isBashEvent(event: ToolCallEvent): event is BashToolCallEvent {
    return isToolCallEventType("bash", event);
  }

  /**
   * Determines if the event is a tool call where "path" exists
   * @param event The event
   * @returns True if "path" exists
   */
  isPathEvent(event: ToolCallEvent): boolean {
    const pathTools = ["read", "edit", "write", "find", "grep", "ls"];
    return pathTools.some((tool) => isToolCallEventType(tool, event));
  }

  /**
   * Impersonates the bash command, if possible
   *
   * @param cmd The bash command whose paths will be impersonated
   * @param ctx The extension context
   * @returns The command with impersonated paths
   */
  async resolveCommand(cmd: string, ctx: ExtensionContext): Promise<string> {
    return await this.impersonator.resolveCommand(cmd, ctx);
  }

  /**
   * Impersonates the path, if possible
   *
   * @param path The path to be impersonated
   * @param ctx The extension context
   * @returns The impersonated path, if available
   */
  async resolvePath(path: string, ctx: ExtensionContext): Promise<string> {
    return await this.impersonator.resolvePath(path, ctx);
  }

  /**
   * Returns the mapper used by the impersonator.
   * Delegates to impersonator instance
   *
   * @param ctx The extension context
   * @returns The source -> target path mapping
   */
  getMapper(ctx: ExtensionContext): Record<string, string> {
    return this.impersonator.getMapper(ctx.cwd);
  }

  /**
   * Validates the configuration settings
   *
   * @param ctx The extension context
   * @returns The validated configuration
   */
  private async verifySettings(ctx: ExtensionContext): Promise<GitboxConfig> {
    const { config, errors } = await settings.getConfig();
    if (errors.length > 0) {
      const message = ["[pi-gitbox]", ...errors].join("\n");
      ctx.ui.notify(message, "warning");
    }

    return config;
  }

  /**
   * Creates the base gitbox
   *
   * @param ctx The extension context
   * @returns The path for the gitbox
   */
  private async getOrCreate(ctx: ExtensionContext): Promise<string> {
    const { config } = await settings.getConfig();
    const { baseDir } = config;
    const cwd = basename(ctx.cwd);

    const impersonationDir = resolve(baseDir, cwd);
    if (await Detector.pathExists(impersonationDir)) return impersonationDir;

    try {
      await mkdir(impersonationDir, { recursive: true });
      return impersonationDir;
    } catch (error) {
      throw new Error(`Failed to create gitbox: ${error}`);
    }
  }

  /**
   * Removes the gitbox
   *
   * @param ctx The extension context
   */
  private async removeGitbox(ctx: ExtensionContext): Promise<void> {
    const gitboxPath = await this.getOrCreate(ctx);

    if (!(await Detector.pathExists(gitboxPath))) return;
    try {
      await rm(gitboxPath, { recursive: true });
    } catch (error) {
      ctx.ui.notify(`Failed to remove gitbox: ${error}`, "error");
    }
  }

  /**
   * Determines the current status of the gitbox based on its existence.
   *
   * @returns Status
   * - "BYPASSED" if bypassGitbox is enabled
   * - "ENABLED" if the gitbox was created and gitignored paths exist
   * - "AVAILABLE" if the gitbox was created, but there are no gitignored paths
   * - "NOT_REQUIRED" if the current working directory is not a git repository
   * - "UNAVAILABLE" if `git` command is not found
   */
  private async getStatus(): Promise<Status> {
    const { config } = await settings.getConfig();
    const { bypassGitbox } = config;

    // If bypass mode is enabled, return bypassed status
    if (bypassGitbox) return Status.BYPASSED;

    if (!Detector.isGitAvailable()) return Status.UNAVAILABLE;
    if (!Detector.isGitProject()) return Status.NOT_REQUIRED;

    const paths = Detector.getGitignoredFiles();
    if (paths.length === 0) return Status.AVAILABLE;

    return Status.ENABLED;
  }
}
