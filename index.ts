import {
  ExtensionCommandContext,
  ExtensionContext,
  getAgentDir,
  ToolCallEvent,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { execSync } from "child_process";
import { join } from "node:path";
import { CommandManager } from "./src/commands";
import { BASE_ALLOWED_PATHS } from "./src/config/defaults";
import { Detector } from "./src/core/detector";
import { Gitbox } from "./src/gitbox";
import { Impersonator } from "./src/core/impersonator";
import { checkPathsAccess } from "./src/prompts";
import { Settings } from "./src/settings";

export default async (pi: ExtensionAPI) => {
  const settings = new Settings(join(getAgentDir(), "settings.json"));
  const detector = new Detector(execSync);
  const impersonator = new Impersonator(detector, settings);
  const gitbox = new Gitbox(impersonator, detector, settings);
  const commandManager = new CommandManager(gitbox, impersonator, settings);

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
        const blocked = await checkPathsAccess(
          settings,
          detector,
          paths,
          resolvedDirs,
          ctx,
        );
        if (blocked) return blocked;
      }

      // Then, impersonate the command
      if (!config.bypassGitbox)
        event.input.command = await impersonator.resolveCommand(
          command,
          ctx.cwd,
        );
    } else if (gitbox.isPathEvent(event)) {
      const { path } = event.input as { path: string };

      // First, scan if we can even access the paths
      if (!config.bypassPaths) {
        const blocked = await checkPathsAccess(
          settings,
          detector,
          [path],
          resolvedDirs,
          ctx,
        );
        if (blocked) return blocked;
      }

      // Then, impersonate the path
      if (!config.bypassGitbox)
        (event.input as { path: string }).path = await impersonator.resolvePath(
          path,
          ctx.cwd,
        );
    }
  });
};
