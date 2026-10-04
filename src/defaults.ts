import { getAgentDir, getPackageDir } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";

/**
 * Identifier for the status bar entry
 */
export const STATUS_KEY = "gitbox";

/**
 * Default for system notifications setting.
 */
export const SYSTEM_NOTIFICATIONS_DEFAULT = true;

/**
 * Default paths that are always allowed.
 */
export const BASE_ALLOWED_PATHS: string[] = [
  // The current working directory
  process.cwd(),

  // Pi's agent library location,
  getPackageDir(),

  // User settings
  getAgentDir(),

  // Common paths
  "/dev/null",
];
