import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { dirname } from "node:path";
import { sendNotification } from "./utils/notifications";
import { Detector } from "./core/detector";
import { normalizePath, resolvePaths } from "./utils/compat";
import { BypassPathsSettingsItem } from "./settings/items/bypass-paths";
import type { Settings } from "./settings";

/**
 * Prompt options
 */
enum Options {
  ALLOW_ONCE = "Allow once",
  BYPASS_SESSION = "Bypass (session only)",
  BYPASS_SAVE = "Bypass (saved globally)",
  CANCEL = "Cancel",
}

/**
 * Asks the user if they want to allow access to a path outside the allowed directories.
 * If the user denies, or if UI is not available, the function blocks with a reason.
 *
 * @param ctx The extension context
 * @param path The path to check
 * @returns An object with `block: true` and a `reason` if blocked, or `{ block: false }` if allowed
 */
const askUserOrBlock = async (
  settings: Settings,
  ctx: ExtensionContext,
  path: string,
): Promise<{ block: boolean; reason?: string }> => {
  // Check if UI is available
  if (!ctx.hasUI) {
    const reason = [
      `Access denied to ${path}: UI not available.`,
      `Enable "${new BypassPathsSettingsItem().id}" to skip prompt in no-UI mode.`,
    ].join(" ");
    return { block: true, reason };
  }

  // Setup message to show
  const message = `Allow "${path}" to be accessed?`;
  const prompt = `[pi-gitbox]: ${message}`;

  const { config } = await settings.getConfig();
  sendNotification(message, config.systemNotifications);

  const selected = await ctx.ui.select(prompt, Object.values(Options));

  // Cancel is equivalent to deny
  const reason = `Path "${path}" is outside allowed directories and was denied.`;
  if (!selected || selected === Options.CANCEL) return { block: true, reason };

  // Handle allow once
  if (selected === Options.ALLOW_ONCE) {
    return { block: false };
  }

  // Handle the bypass options.
  if (selected === Options.BYPASS_SESSION) {
    config.allowedPaths = [...config.allowedPaths, path];
  } else if (selected === Options.BYPASS_SAVE) {
    await settings.setConfig({ allowedPaths: [...config.allowedPaths, path] });
  }

  return { block: false };
};

/**
 * Finds the deepest existing ancestor of a path by walking up from the
 * full path through each parent directory until root.
 *
 * @param path The path to check
 * @param cwd Working directory to resolve relative paths against
 * @param detector The detector instance for existence checks
 * @returns The deepest existing path, or null if nothing exists
 */
const findDeepestExistingParent = async (
  path: string,
  cwd: string,
  detector: Detector,
): Promise<string | null> => {
  let current = resolvePaths(cwd, normalizePath(path));

  while (current !== "/") {
    if (await detector.pathExists(current, cwd)) {
      return current;
    }
    current = dirname(current);
  }

  return null;
};

/**
 * Checks if all paths are allowed, prompting the user if needed.
 *
 * For paths outside allowed directories, finds the deepest existing
 * ancestor and prompts for that. If nothing exists, silently skips.
 *
 * @param paths Paths to check
 * @param resolvedDirs Allowed directories
 * @param ctx The extension context
 * @returns The blocked response if any path was denied, or null
 */
export const checkPathsAccess = async (
  settings: Settings,
  detector: Detector,
  paths: string[],
  resolvedDirs: string[],
  ctx: ExtensionContext,
): Promise<{ block: boolean; reason?: string } | null> => {
  const pending: string[] = [];

  for (const path of new Set(paths)) {
    if (detector.isPathAllowed(resolvedDirs, path, ctx.cwd)) continue;

    const deepest = await findDeepestExistingParent(path, ctx.cwd, detector);
    if (deepest) {
      pending.push(deepest);
    }
  }

  for (const path of pending) {
    const response = await askUserOrBlock(settings, ctx, path);
    if (response.block) return response;
  }
  return null;
};
