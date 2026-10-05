import {
  BashToolCallEvent,
  ExtensionContext,
  isToolCallEventType,
  ToolCallEvent,
} from "@earendil-works/pi-coding-agent";
import { mkdir, rm } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { GitboxConfig, Status } from "./config/types";
import { Detector } from "./core/detector";
import { Impersonator } from "./core/impersonator";
import { Renderer } from "./renderer";
import { settings } from "./settings";
import { StatusStrategy } from "./core/status-strategy";

export class Gitbox {
  private readonly statusStrategy: StatusStrategy;

  constructor(
    private readonly impersonator: Impersonator,
    private readonly detector: Detector,
  ) {
    this.statusStrategy = new StatusStrategy(detector);
  }

  async initialize(ctx: ExtensionContext) {
    await this.verifySettings(ctx);

    // Only create the gitbox folder if it makes sense
    const status = await this.getStatus(ctx);
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
    if (await this.detector.pathExists(impersonationDir))
      return impersonationDir;

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

    if (!(await this.detector.pathExists(gitboxPath))) return;
    try {
      await rm(gitboxPath, { recursive: true });
    } catch (error) {
      ctx.ui.notify(`Failed to remove gitbox: ${error}`, "error");
    }
  }

  /**
   * Determines the current status of the gitbox based on its existence.
   *
   * @param ctx The extension context.
   * @returns Status
   * - "BYPASSED" if bypassGitbox is enabled
   * - "ENABLED" if the gitbox was created and gitignored paths exist
   * - "AVAILABLE" if the gitbox was created, but there are no gitignored paths
   * - "NOT_REQUIRED" if the current working directory is not a git repository
   * - "UNAVAILABLE" if `git` command is not found
   */
  private async getStatus(ctx: ExtensionContext): Promise<Status> {
    const { config } = await settings.getConfig();
    return this.statusStrategy.resolve(config, ctx.cwd);
  }
}
