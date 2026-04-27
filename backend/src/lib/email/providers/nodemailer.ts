import nodemailer, { Transporter } from "nodemailer";

import { logger } from "../../logger";
import { EmailMessage, EmailProvider, EmailSendResult } from "../types";

const log = logger.child("email:nodemailer");

export type NodemailerProviderOptions = {
  /** Nodemailer's well-known service name (e.g. "gmail", "outlook365"). Mutually exclusive with `host`. */
  service?: string;
  /** Generic SMTP host. Required when `service` is not set. */
  host?: string;
  /** SMTP port. Defaults to 587 (STARTTLS). Use 465 for implicit TLS. */
  port?: number;
  /** Implicit TLS (port 465). When `false`, STARTTLS is used. Defaults based on port. */
  secure?: boolean;
  /** SMTP username (full email address for Gmail). */
  user: string;
  /** SMTP password — for Gmail this MUST be a 16-character App Password, not the account password. */
  pass: string;
  /** Default `from` if a message doesn't specify one. */
  defaultFrom: string;
  /** Display name for the provider (used in logs). */
  name?: string;
};

/**
 * Sends email through any Nodemailer-supported transport. Two modes:
 *
 *   1. Service mode — pass `service: "gmail"` (or "outlook365", etc.) and
 *      Nodemailer applies the correct host/port/security automatically.
 *      For Gmail you need an App Password (https://myaccount.google.com/apppasswords).
 *
 *   2. Generic SMTP mode — pass `host`, `port`, and `secure` directly.
 *
 * Domain ownership is NOT required, which is the main draw over Resend for
 * personal projects.
 */
export class NodemailerEmailProvider implements EmailProvider {
  readonly name: string;
  private readonly transporter: Transporter;
  private readonly defaultFrom: string;

  constructor(opts: NodemailerProviderOptions) {
    this.name = opts.name ?? "nodemailer";
    this.defaultFrom = opts.defaultFrom;

    if (opts.service) {
      this.transporter = nodemailer.createTransport({
        service: opts.service,
        auth: { user: opts.user, pass: opts.pass }
      });
    } else if (opts.host) {
      const port = opts.port ?? 587;
      this.transporter = nodemailer.createTransport({
        host: opts.host,
        port,
        secure: opts.secure ?? port === 465,
        auth: { user: opts.user, pass: opts.pass }
      });
    } else {
      throw new Error(
        "Nodemailer: either `service` (e.g. 'gmail') or `host` must be provided."
      );
    }
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const from = message.from ?? this.defaultFrom;
    if (!from) {
      throw new Error("Nodemailer: missing `from` (set EMAIL_FROM or pass `message.from`).");
    }
    if (!message.html && !message.text) {
      throw new Error("Nodemailer: at least one of `html` or `text` must be provided.");
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        ...(message.html ? { html: message.html } : {}),
        ...(message.text ? { text: message.text } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {})
      });

      log.info("Email sent via Nodemailer", {
        messageId: info.messageId,
        to: message.to,
        accepted: info.accepted?.length ?? 0,
        rejected: info.rejected?.length ?? 0
      });

      // If the SMTP server accepted some addresses but rejected others, surface that.
      if (info.rejected && info.rejected.length > 0) {
        log.warn("Some recipients were rejected by the SMTP server", {
          rejected: info.rejected
        });
      }

      return { provider: this.name, id: info.messageId };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      log.error("Nodemailer rejected the request", { from, to: message.to, detail });
      throw new Error(`Nodemailer send failed — ${detail}`);
    }
  }
}
