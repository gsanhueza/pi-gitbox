import {
  ExtensionCommandContext,
  ExtensionContext,
  ToolCallEvent,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { execSync } from "child_process";
import { CommandManager } from "./src/commands";
import { BASE_ALLOWED_PATHS } from "./src/config/defaults";
import { Detector } from "./src/core/detector";
import { Gitbox } from "./src/gitbox";
import { Impersonator } from "./src/core/impersonator";
import { checkPathsAccess } from "./src/prompts";
import { settings } from "./src/settings";

export default async (pi: ExtensionAPI) => {
  const detector = new Detector(execSync);
  const impersonator = new Impersonator(detector);
  const gitbox = new Gitbox(impersonator, detector);

  const commandManager = new CommandManager(gitbox);

  // Command registration
  pi.registerCommand("gitbox", {
    description: "Open settings menu to configure Gitbox options",
    getArgumentCompletions: commandManager.getArgumentCompletions,
    handler: async (args: string, ctx: ExtensionCommandContext) =>
      await commandManager.runGitbox(args, ctx),
  });

  // Events
  pi.on("session_start", async (_, ctx: ExtensionContext) => {
    await gitbox.initialize(ctx);
  });

  pi.on("session_shutdown", async (_, ctx: ExtensionContext) => {
    await gitbox.shutdown(ctx);
  });

  pi.on("tool_call", async (event: ToolCallEvent, ctx: ExtensionContext) => {
    const { config } = await settings.getConfig();
    const resolvedDirs = [...BASE_ALLOWED_PATHS, ...config.allowedPaths];

    if (gitbox.isBashEvent(event)) {
      const { command } = event.input;

      // First, scan if we can even access the paths
      if (!config.bypassPaths) {
        const paths = await impersonator.extractFromCommand(command);
        const skipMissing =
          config.skipMissingPaths && gitbox.isReadOnlyCommand(command);
        const blocked = await checkPathsAccess(
          detector,
          paths,
          resolvedDirs,
          ctx,
          skipMissing,
        );
        if (blocked) return blocked;
      }

      // Then, impersonate the command
      if (!config.bypassGitbox)
        event.input.command = await gitbox.resolveCommand(command, ctx);
    } else if (gitbox.isPathEvent(event)) {
      const { path } = event.input as { path: string };

      // First, scan if we can even access the paths
      if (!config.bypassPaths) {
        const skipMissing =
          config.skipMissingPaths && !gitbox.isWritingEvent(event);
        const blocked = await checkPathsAccess(
          detector,
          [path],
          resolvedDirs,
          ctx,
          skipMissing,
        );
        if (blocked) return blocked;
      }

      // Then, impersonate the path
      if (!config.bypassGitbox)
        (event.input as { path: string }).path = await gitbox.resolvePath(
          path,
          ctx,
        );
    }
  });
};
