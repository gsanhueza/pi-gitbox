/**
 * Configuration for the pi-gitbox extension.
 * All fields can be overridden via ~/.pi/agent/settings.json under the "gitbox" key.
 */
export interface GitboxConfig {
  baseDir: string;
  statusBar: boolean;
  deleteOnExit: boolean;
  // Impersonation
  impersonateDirs: boolean;
  bypassGitbox: boolean;
  // Permissions
  bypassPaths: boolean;
  allowedPaths: string[];
}

/**
 * Texts for the status bar
 */
export enum Status {
  ENABLED = "Enabled",
  AVAILABLE = "Available",
  NOT_REQUIRED = "Not required",
  UNAVAILABLE = "Unavailable",
  BYPASSED = "Bypassed",
}
