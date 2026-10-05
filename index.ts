import {
  ExtensionCommandContext,
  ExtensionContext,
  getAgentDir,
  ToolCallEvent,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { execSync } from "child_process";
import { join } from "node:path";
import { GitboxCommand } from "./src/commands/gitbox-command";
import { PathsReport } from "./src/commands/paths-report";
import { SettingsMenuController } from "./src/commands/settings-controller";
import { Detector } from "./src/core/detector";
import { ToolCallProcessor } from "./src/core/tool-call-processor";
import { Gitbox } from "./src/gitbox";
import { Impersonator } from "./src/core/impersonator/impersonator";
import { Settings } from "./src/settings";

export default async (pi: ExtensionAPI) => {
  const settings = new Settings(join(getAgentDir(), "settings.json"));
  const detector = new Detector(execSync);
  const impersonator = new Impersonator(detector, settings);
  const gitbox = new Gitbox(impersonator, detector, settings);
  const toolCallProcessor = new ToolCallProcessor(
    settings,
    detector,
    impersonator,
  );
  const pathsReport = new PathsReport(impersonator);
  const settingsMenu = new SettingsMenuController(gitbox, settings);
  const commandManager = new GitboxCommand(pathsReport, settingsMenu);

  // Command registration
  pi.registerCommand("gitbox", {
    description: "Open settings menu to configure Gitbox options",
    getArgumentCompletions: commandManager.getArgumentCompletions,
    handler: async (args: string, ctx: ExtensionCommandContext) =>
      await commandManager.run(args, ctx),
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
    return toolCallProcessor.handle(event, ctx, config);
  });
};
