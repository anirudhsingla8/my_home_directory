import { logger } from "../../logger";
import { EmailMessage, EmailProvider, EmailSendResult } from "../types";

/**
 * Does nothing. Use when emails should be silently disabled (e.g. CI).
 */
export class NoopEmailProvider implements EmailProvider {
  readonly name = "noop";
  private readonly log = logger.child("email:noop");

  async send(_message: EmailMessage): Promise<EmailSendResult> {
    this.log.debug("Email suppressed");
    return { provider: this.name };
  }
}
