import path from "path";

import { ConsoleTransport, FileTransport } from "./transports";
import { LogEntry, LogLevel, LogTransport } from "./types";

export type { LogEntry, LogLevel, LogTransport } from "./types";
export { ConsoleTransport, FileTransport } from "./transports";

/**
 * Application logger. Fan-outs to one or more transports.
 *
 * Usage:
 *   import { logger } from "../lib/logger";
 *   logger.info("User signed up", { userId });
 *   logger.error("Failed to charge card", { err });
 *
 * Adding a new sink (e.g. Datadog):
 *   1. Implement `LogTransport`.
 *   2. Call `logger.setTransports([new DatadogTransport(...), ...])` at boot,
 *      or extend the default factory below to include it when an env flag
 *      is set.
 *
 * Child loggers carry a `context` label (e.g. "auth", "items") so a single
 * grep / filter narrows down the source quickly.
 */
export class Logger {
  private transports: LogTransport[];
  constructor(
    transports: LogTransport[],
    private readonly context?: string
  ) {
    this.transports = transports;
  }

  setTransports(transports: LogTransport[]): void {
    this.transports = transports;
  }

  child(context: string): Logger {
    return new Logger(this.transports, this.context ? `${this.context}:${context}` : context);
  }

  private dispatch(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      meta
    };
    for (const transport of this.transports) {
      try {
        const result = transport.log(entry);
        if (result && typeof (result as Promise<void>).catch === "function") {
          (result as Promise<void>).catch(() => {});
        }
      } catch {
        /* a single broken transport must not take down the request */
      }
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.dispatch("debug", message, meta);
  }
  info(message: string, meta?: Record<string, unknown>): void {
    this.dispatch("info", message, meta);
  }
  warn(message: string, meta?: Record<string, unknown>): void {
    this.dispatch("warn", message, meta);
  }
  error(message: string, meta?: Record<string, unknown>): void {
    this.dispatch("error", message, meta);
  }
}

const buildDefaultLogger = (): Logger => {
  const env = process.env.NODE_ENV ?? "development";
  const consoleMin: LogLevel = env === "production" ? "info" : "debug";
  const transports: LogTransport[] = [new ConsoleTransport(consoleMin)];

  // File transport is enabled by default; opt-out via LOG_FILE_DISABLED=1
  if (process.env.LOG_FILE_DISABLED !== "1") {
    const directory = process.env.LOG_DIR ?? path.join(process.cwd(), "logs");
    transports.push(new FileTransport({ directory, minLevel: "info" }));
  }

  return new Logger(transports);
};

export const logger = buildDefaultLogger();
