import { getAgentDir, getPackageDir } from "@earendil-works/pi-coding-agent";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Identifier for the status bar entry
 */
export const STATUS_KEY = "gitbox";

/**
 * Default base directory for gitboxes (inside the agent directory).
 */
export const GITBOX_BASEDIR = join(getAgentDir(), "gitbox");

/**
 * Temporary directory for gitboxes (system temp folder).
 */
export const TEMPORAL_GITBOX = tmpdir();

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
