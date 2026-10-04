import type { GitboxConfig } from "./config-types";
import { Status } from "./config-types";
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
   * @returns The resolved Status.
   */
  resolve(config: GitboxConfig): Status {
    const conditions: StatusCondition[] = [
      { check: (c) => c.bypassGitbox, status: Status.BYPASSED },
      {
        check: (c) => !this.detector.isGitAvailable(),
        status: Status.UNAVAILABLE,
      },
      {
        check: (c) => !this.detector.isGitProject(),
        status: Status.NOT_REQUIRED,
      },
      {
        check: (c) => this.detector.getGitignoredPaths().length === 0,
        status: Status.AVAILABLE,
      },
    ];

    for (const { check, status } of conditions) {
      if (check(config)) return status;
    }

    return Status.ENABLED;
  }
}
