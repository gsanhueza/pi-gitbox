import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { dirname } from "node:path";
import { sendNotification } from "./utils/notifications";
import { settings } from "./settings";
import { Detector } from "./core/detector";
import { normalizePath, resolvePaths } from "./utils/compat";

/**
 * Prompt options
 */
enum Options {
  ALLOW = "Allow",
  DENY = "Deny",
  BYPASS_SESSION = "Bypass (session only)",
  BYPASS_SAVE = "Bypass (saved globally)",
}

/**
 * Asks the user if they want to allow access to a path outside the allowed directories.
 * If the user denies, or if UI is not available, the function blocks with a reason.
 *
 * @param ctx The extension context
 * @param path The path to check
 * @returns An object with `block: true` and a `reason` if blocked, or `{ block: false }` if allowed
 */
export const askUserOrBlock = async (
  ctx: ExtensionContext,
  path: string,
): Promise<{ block: boolean; reason?: string }> => {
  const reason = `Path "${path}" is outside allowed directories and was denied.`;

  // Check if UI is available
  const { config } = await settings.getConfig();
  if (!ctx.hasUI) {
    return { block: true, reason };
  }

  const prompt = `[pi-gitbox]: Allow "${path}" to be accessed?`;

  // Send system notification before showing the UI prompt
  if (config.systemNotifications) {
    await sendNotification(`Allow "${path}" to be accessed?`);
  }

  const allowed = await ctx.ui.select(prompt, Object.values(Options));

  // Process the selected option
  if (!allowed || allowed === Options.DENY) return { block: true, reason };

  // Handle the bypass options.
  if (allowed === Options.BYPASS_SESSION) {
    config.allowedPaths = [...config.allowedPaths, path];
  } else if (allowed === Options.BYPASS_SAVE) {
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
  detector: Detector,
  paths: string[],
  resolvedDirs: string[],
  ctx: ExtensionContext,
): Promise<{ block: boolean; reason?: string } | null> => {
  const pending: string[] = [];

  for (const path of new Set(paths)) {
    if (detector.isPathAllowed(resolvedDirs, path, ctx)) continue;

    const deepest = await findDeepestExistingParent(path, ctx.cwd, detector);
    if (deepest) {
      pending.push(deepest);
    }
  }

  for (const path of pending) {
    const response = await askUserOrBlock(ctx, path);
    if (response.block) return response;
  }
  return null;
};
