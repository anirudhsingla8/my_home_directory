/**
 * Email service contracts.
 *
 * Adding a new provider (SES, Mailgun, Postmark, Sendgrid, etc.) means
 * implementing `EmailProvider` and registering it via the factory in
 * `index.ts`. The rest of the codebase only ever calls `sendEmail`.
 *
 * The provider used at runtime is selected by the `EMAIL_PROVIDER` env var.
 */

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  id?: string;
  provider: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
