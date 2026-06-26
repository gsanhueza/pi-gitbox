import { getAgentDir, getPackageDir } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";

/**
 * Identifier for the status bar entry
 */
export const STATUS_KEY = "gitbox";

/**
 * Default base directory for gitboxes
 */
export const GITBOX_BASEDIR = join(getAgentDir(), "gitbox");

/**
 * Whether to add a text in the status bar
 */
export const GITBOX_STATUSBAR = true;

/**
 * Whether to delete the gitbox when the extension exits
 */
export const DELETE_ON_EXIT = false;

/**
 * Whether to also impersonate gitignored directories
 */
export const IMPERSONATE_DIRS = false;

/**
 * Whether to bypass impersonation entirely
 */
export const BYPASS_GITBOX = false;

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

/**
 * Allowed paths, configurable by the user
 * Extra paths can be added via `allowedPaths` in settings.
 */
export const ALLOWED_PATHS: string[] = [];

/**
 * Whether to bypass path restrictions
 */
export const BYPASS_PATHS = false;
