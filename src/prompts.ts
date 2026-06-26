import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Detector } from "./detector";
import { settings } from "./settings";

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
 * Checks if all paths are allowed, prompting the user if needed.
 *
 * @param paths Paths to check
 * @param resolvedDirs Allowed directories
 * @param ctx The extension context
 * @returns The blocked response if any path was denied, or null
 */
export const checkPathsAccess = async (
  paths: string[],
  resolvedDirs: string[],
  ctx: ExtensionContext,
): Promise<{ block: boolean; reason?: string } | null> => {
  for (const path of paths) {
    if (Detector.isPathAllowed(resolvedDirs, path, ctx)) continue;

    const response = await askUserOrBlock(ctx, path);
    if (response.block) return response;
  }
  return null;
};
