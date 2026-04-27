import { Resend } from "resend";

import { logger } from "../../logger";
import { EmailMessage, EmailProvider, EmailSendResult } from "../types";

const log = logger.child("email:resend");

/**
 * Resend (https://resend.com) provider. Requires:
 *   RESEND_API_KEY  — API key
 *   EMAIL_FROM      — verified sender (e.g. "Acme <noreply@yourdomain.com>")
 *
 * For local dev without a verified domain you can set
 *   EMAIL_FROM="Home Inventory <onboarding@resend.dev>"
 * which is Resend's sandbox sender — but it can only deliver to your own
 * verified-account email address.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private readonly client: Resend;
  private readonly defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.client = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const from = message.from ?? this.defaultFrom;
    if (!from) {
      throw new Error("Resend: missing `from` (set EMAIL_FROM or pass `message.from`).");
    }
    if (!message.html && !message.text) {
      throw new Error("Resend: at least one of `html` or `text` must be provided.");
    }

    const to = Array.isArray(message.to) ? message.to : [message.to];

    // Resend's SDK type discriminates between html/text/react/template variants,
    // so we build one of two narrowed shapes depending on what's available.
    // Passing `undefined` for `replyTo` or an empty `html` can cause the API
    // to reject the request, so we omit them entirely when not set.
    const payload = message.html
      ? {
          from,
          to,
          subject: message.subject,
          html: message.html,
          ...(message.text ? { text: message.text } : {}),
          ...(message.replyTo ? { replyTo: message.replyTo } : {})
        }
      : {
          from,
          to,
          subject: message.subject,
          text: message.text!,
          ...(message.replyTo ? { replyTo: message.replyTo } : {})
        };

    const { data, error } = await this.client.emails.send(payload);

    if (error) {
      // Resend returns { name, message, statusCode? } — surface all of it so
      // the user can diagnose (unverified domain, invalid API key, etc.).
      const detail =
        typeof error === "object"
          ? `${error.name ?? "Error"}: ${error.message ?? JSON.stringify(error)}`
          : String(error);
      log.error("Resend API rejected the request", { from, to: payload.to, detail });
      throw new Error(`Resend send failed — ${detail}`);
    }

    log.info("Email sent via Resend", { id: data?.id, to: payload.to });
    return { provider: this.name, id: data?.id };
  }
}
