import type { GitboxConfig } from "../config/types";
import { Status } from "../config/types";
import type { Detector } from "./detector";

/**
 * A single status condition with a check function and its resulting status.
 */
interface StatusCondition {
  check: (config: GitboxConfig) => boolean;
  status: Status;
}

/**
 * Resolves the current gitbox status based on configuration and detector state.
 *
 * Each condition is evaluated in order; the first match wins.
 * If no condition matches, returns `Status.ENABLED`.
 *
 * @example
 * ```typescript
 * const strategy = new StatusStrategy(detector);
 * const status = strategy.resolve(config);
 * ```
 */
export class StatusStrategy {
  constructor(private readonly detector: Detector) {}

  /**
   * Resolves the current status for the given configuration.
   *
   * @param config The current GitboxConfig.
   * @param cwd The directory to run git commands in.
   * @returns The resolved Status.
   */
  resolve(config: GitboxConfig, cwd: string): Status {
    const conditions: StatusCondition[] = [
      { check: (c) => c.bypassGitbox, status: Status.BYPASSED },
      {
        check: () => !this.detector.isGitAvailable(cwd),
        status: Status.UNAVAILABLE,
      },
      {
        check: () => !this.detector.isGitProject(cwd),
        status: Status.NOT_REQUIRED,
      },
      {
        check: () => this.detector.getGitignoredPaths(cwd).length === 0,
        status: Status.AVAILABLE,
      },
    ];

    for (const { check, status } of conditions) {
      if (check(config)) return status;
    }

    return Status.ENABLED;
  }
}
