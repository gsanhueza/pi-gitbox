import {
  BashToolCallEvent,
  ExtensionContext,
  isToolCallEventType,
  ToolCallEvent,
} from "@earendil-works/pi-coding-agent";
import { BASE_ALLOWED_PATHS } from "../config/defaults";
import { GitboxConfig } from "../config/types";
import { checkPathsAccess } from "../path-access";
import { Settings } from "../settings";
import { Detector } from "./detector";
import { Impersonator } from "./impersonator/impersonator";

/**
 * Response returned when a tool call is blocked, or undefined to proceed
 */
type BlockResponse = { block: boolean; reason?: string } | undefined;

/**
 * Processes tool call events by guarding access to git-ignored paths
 * and impersonating them when enabled.
 *
 * Both bash commands and path-based tool calls follow the same flow:
 * an access check (unless bypassed) followed by impersonation (unless bypassed).
 */
export class ToolCallProcessor {
  /**
   * @param settings Settings providing the Gitbox configuration
   * @param detector Detector used for path access checks
   * @param impersonator Impersonator used to resolve commands and paths
   */
  constructor(
    private readonly settings: Settings,
    private readonly detector: Detector,
    private readonly impersonator: Impersonator,
  ) {}

  /**
   * Handles a tool call event
   * @param event The tool call event
   * @param ctx The extension context
   * @param config The validated Gitbox configuration
   * @returns The blocked response if access was denied, or undefined
   */
  async handle(
    event: ToolCallEvent,
    ctx: ExtensionContext,
    config: GitboxConfig,
  ): Promise<BlockResponse> {
    const resolvedDirs = [...BASE_ALLOWED_PATHS, ...config.allowedPaths];

    if (this.isBashEvent(event))
      return this.handleBash(event, config, resolvedDirs, ctx);
    if (this.isPathEvent(event))
      return this.handlePath(event, config, resolvedDirs, ctx);

    return undefined;
  }

  /**
   * Determines if the event is a "bash" tool call
   * @param event The event
   * @returns True if "bash" event
   */
  private isBashEvent(event: ToolCallEvent): event is BashToolCallEvent {
    return isToolCallEventType("bash", event);
  }

  /**
   * Determines if the event is a tool call where "path" exists
   * @param event The event
   * @returns True if "path" exists
   */
  private isPathEvent(event: ToolCallEvent): boolean {
    const pathTools = ["read", "edit", "write", "find", "grep", "ls"];
    return pathTools.some((tool) => isToolCallEventType(tool, event));
  }

  /**
   * Handles bash tool calls: checks the paths referenced by the command
   * and impersonates the command itself
   * @param event The bash tool call event
   * @param config The validated Gitbox configuration
   * @param resolvedDirs Allowed directories
   * @param ctx The extension context
   * @returns The blocked response if access was denied, or undefined
   */
  private async handleBash(
    event: BashToolCallEvent,
    config: GitboxConfig,
    resolvedDirs: string[],
    ctx: ExtensionContext,
  ): Promise<BlockResponse> {
    const { command } = event.input;
    const paths = this.impersonator.extractFromCommand(command);

    const blocked = await this.checkAccess(paths, config, resolvedDirs, ctx);
    if (blocked) return blocked;

    if (!config.bypassGitbox)
      event.input.command = await this.impersonator.resolveCommand(
        command,
        ctx.cwd,
      );

    return undefined;
  }

  /**
   * Handles path-based tool calls: checks the requested path
   * and impersonates it
   * @param event The path-based tool call event
   * @param config The validated Gitbox configuration
   * @param resolvedDirs Allowed directories
   * @param ctx The extension context
   * @returns The blocked response if access was denied, or undefined
   */
  private async handlePath(
    event: ToolCallEvent,
    config: GitboxConfig,
    resolvedDirs: string[],
    ctx: ExtensionContext,
  ): Promise<BlockResponse> {
    const { path } = event.input as { path: string };

    const blocked = await this.checkAccess([path], config, resolvedDirs, ctx);
    if (blocked) return blocked;

    if (!config.bypassGitbox)
      (event.input as { path: string }).path =
        await this.impersonator.resolvePath(path, ctx.cwd);

    return undefined;
  }

  /**
   * Checks access to the given paths unless path checks are bypassed
   * @param paths Paths to check
   * @param config The validated Gitbox configuration
   * @param resolvedDirs Allowed directories
   * @param ctx The extension context
   * @returns The blocked response if access was denied, or undefined
   */
  private async checkAccess(
    paths: string[],
    config: GitboxConfig,
    resolvedDirs: string[],
    ctx: ExtensionContext,
  ): Promise<BlockResponse> {
    if (config.bypassPaths) return undefined;

    const result = await checkPathsAccess(
      this.settings,
      this.detector,
      paths,
      resolvedDirs,
      ctx,
    );
    if (!result.block) return undefined;
    return result;
  }
}
