import { logger } from "../logger";

import { ConsoleEmailProvider } from "./providers/console";
import { NodemailerEmailProvider } from "./providers/nodemailer";
import { NoopEmailProvider } from "./providers/noop";
import { ResendEmailProvider } from "./providers/resend";
import { EmailMessage, EmailProvider, EmailSendResult } from "./types";

export type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

const log = logger.child("email");

const buildProvider = (): EmailProvider => {
  const choice = (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();

  switch (choice) {
    case "resend": {
      const apiKey = process.env.RESEND_API_KEY;
      const defaultFrom = process.env.EMAIL_FROM ?? "";
      if (!apiKey) {
        log.warn("EMAIL_PROVIDER=resend but RESEND_API_KEY is missing — falling back to console.");
        return new ConsoleEmailProvider();
      }
      if (!defaultFrom) {
        log.warn("EMAIL_PROVIDER=resend but EMAIL_FROM is missing — falling back to console.");
        return new ConsoleEmailProvider();
      }
      log.info("Using Resend email provider");
      return new ResendEmailProvider(apiKey, defaultFrom);
    }
    case "gmail":
    case "nodemailer": {
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const defaultFrom = process.env.EMAIL_FROM ?? user ?? "";
      // For "gmail" we hard-wire the service. For "nodemailer" we let the
      // operator pick: SMTP_SERVICE for a known service, or SMTP_HOST for raw SMTP.
      const service = choice === "gmail" ? "gmail" : process.env.SMTP_SERVICE;
      const host = process.env.SMTP_HOST;

      if (!user || !pass) {
        log.warn(
          `EMAIL_PROVIDER=${choice} requires SMTP_USER and SMTP_PASS — falling back to console.`
        );
        return new ConsoleEmailProvider();
      }
      if (!defaultFrom) {
        log.warn(`EMAIL_PROVIDER=${choice} but EMAIL_FROM is missing — falling back to console.`);
        return new ConsoleEmailProvider();
      }
      if (!service && !host) {
        log.warn(
          `EMAIL_PROVIDER=${choice} requires SMTP_SERVICE or SMTP_HOST — falling back to console.`
        );
        return new ConsoleEmailProvider();
      }

      log.info(`Using Nodemailer email provider (${service ?? host})`);
      return new NodemailerEmailProvider({
        service,
        host,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
        secure: process.env.SMTP_SECURE
          ? process.env.SMTP_SECURE.toLowerCase() === "true"
          : undefined,
        user,
        pass,
        defaultFrom,
        name: choice === "gmail" ? "gmail" : "nodemailer"
      });
    }
    case "noop":
      log.info("Using noop email provider (emails disabled)");
      return new NoopEmailProvider();
    case "console":
    default:
      log.info("Using console email provider (emails logged, not sent)");
      return new ConsoleEmailProvider();
  }
};

const provider = buildProvider();

export const sendEmail = (message: EmailMessage): Promise<EmailSendResult> => {
  return provider.send(message);
};

export const getEmailProviderName = (): string => provider.name;
