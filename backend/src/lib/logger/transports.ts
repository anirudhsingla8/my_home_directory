import fs from "fs";
import path from "path";

import { LOG_LEVEL_PRIORITY, LogEntry, LogLevel, LogTransport } from "./types";

const formatLine = (entry: LogEntry): string => {
  const meta = entry.meta && Object.keys(entry.meta).length > 0
    ? ` ${JSON.stringify(entry.meta)}`
    : "";
  const ctx = entry.context ? ` [${entry.context}]` : "";
  return `${entry.timestamp} ${entry.level.toUpperCase()}${ctx} ${entry.message}${meta}`;
};

/**
 * Pretty-printed stderr/stdout transport for local dev.
 * Honors `minLevel` so noisy debug logs can be hidden in production.
 */
export class ConsoleTransport implements LogTransport {
  constructor(private readonly minLevel: LogLevel = "debug") {}

  log(entry: LogEntry): void {
    if (LOG_LEVEL_PRIORITY[entry.level] < LOG_LEVEL_PRIORITY[this.minLevel]) return;

    const line = formatLine(entry);
    if (entry.level === "error") {
      // eslint-disable-next-line no-console
      console.error(line);
    } else if (entry.level === "warn") {
      // eslint-disable-next-line no-console
      console.warn(line);
    } else {
      // eslint-disable-next-line no-console
      console.log(line);
    }
  }
}

/**
 * Append-only NDJSON file transport. One line per entry — easy to ingest
 * downstream (jq, fluent-bit, datadog-agent, etc.). Files are auto-rotated
 * by date: `app-YYYY-MM-DD.log`.
 */
export class FileTransport implements LogTransport {
  private currentDate: string | null = null;
  private stream: fs.WriteStream | null = null;

  constructor(
    private readonly options: {
      directory: string;
      filenamePrefix?: string;
      minLevel?: LogLevel;
    }
  ) {
    try {
      fs.mkdirSync(options.directory, { recursive: true });
    } catch {
      /* fall back to console if dir cannot be created */
    }
  }

  private getStream(): fs.WriteStream | null {
    const today = new Date().toISOString().slice(0, 10);
    if (this.currentDate === today && this.stream) return this.stream;

    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }

    try {
      const prefix = this.options.filenamePrefix ?? "app";
      const filePath = path.join(this.options.directory, `${prefix}-${today}.log`);
      this.stream = fs.createWriteStream(filePath, { flags: "a" });
      this.currentDate = today;
      return this.stream;
    } catch {
      return null;
    }
  }

  log(entry: LogEntry): void {
    const minLevel = this.options.minLevel ?? "info";
    if (LOG_LEVEL_PRIORITY[entry.level] < LOG_LEVEL_PRIORITY[minLevel]) return;

    const stream = this.getStream();
    if (!stream) return;
    try {
      stream.write(JSON.stringify(entry) + "\n");
    } catch {
      /* drop the entry rather than crash the request */
    }
  }
}
