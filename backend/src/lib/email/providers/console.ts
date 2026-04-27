import { logger } from "../../logger";
import { EmailMessage, EmailProvider, EmailSendResult } from "../types";

/**
 * Logs every email to the structured logger instead of sending. Useful for
 * local dev where wiring up an SMTP/Resend account is a hassle.
 */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";
  private readonly log = logger.child("email:console");

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.log.info("Email captured (not sent)", {
      to: message.to,
      subject: message.subject,
      from: message.from,
      preview: (message.text ?? message.html ?? "").slice(0, 240)
    });
    return { provider: this.name };
  }
}
