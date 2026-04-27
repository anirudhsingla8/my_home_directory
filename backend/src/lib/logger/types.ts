/**
 * Logger contracts.
 *
 * Adding a new sink (Datadog, Sentry, CloudWatch, etc.) means implementing
 * `LogTransport` and registering it via `setTransports([...])` or in the
 * default factory in `index.ts`. The rest of the codebase only ever
 * interacts with `Logger`.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  meta?: Record<string, unknown>;
}

export interface LogTransport {
  /**
   * Implementations must not throw — emit to their sink and swallow errors.
   * Returning a promise is fine; callers fire-and-forget.
   */
  log(entry: LogEntry): void | Promise<void>;
}
