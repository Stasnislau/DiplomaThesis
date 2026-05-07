import { Injectable, Logger } from "@nestjs/common";

import { ConfigService } from "@nestjs/config";
import { Transporter, createTransport } from "nodemailer";

interface PasswordResetTemplate {
  subject: string;
  bodyText: (newPassword: string) => string;
  bodyHtml: (newPassword: string) => string;
}

const TEMPLATES: Record<string, PasswordResetTemplate> = {
  en: {
    subject: "Your new password",
    bodyText: (pwd) =>
      `Your password has been reset.\n\nNew password: ${pwd}\n\nFor your security, sign in and change it from the Profile page.`,
    bodyHtml: (pwd) =>
      `<p>Your password has been reset.</p><p><strong>New password:</strong> <code>${pwd}</code></p><p>For your security, sign in and change it from the Profile page.</p>`,
  },
  pl: {
    subject: "Twoje nowe hasło",
    bodyText: (pwd) =>
      `Twoje hasło zostało zresetowane.\n\nNowe hasło: ${pwd}\n\nDla bezpieczeństwa zaloguj się i zmień je w zakładce Profil.`,
    bodyHtml: (pwd) =>
      `<p>Twoje hasło zostało zresetowane.</p><p><strong>Nowe hasło:</strong> <code>${pwd}</code></p><p>Dla bezpieczeństwa zaloguj się i zmień je w zakładce Profil.</p>`,
  },
  es: {
    subject: "Tu nueva contraseña",
    bodyText: (pwd) =>
      `Tu contraseña ha sido restablecida.\n\nNueva contraseña: ${pwd}\n\nPor tu seguridad, inicia sesión y cámbiala desde la página de Perfil.`,
    bodyHtml: (pwd) =>
      `<p>Tu contraseña ha sido restablecida.</p><p><strong>Nueva contraseña:</strong> <code>${pwd}</code></p><p>Por tu seguridad, inicia sesión y cámbiala desde la página de Perfil.</p>`,
  },
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    const host = config.get<string>("mail.host");
    const port = config.get<number>("mail.port");
    const user = config.get<string>("mail.user");
    const pass = config.get<string>("mail.pass");
    this.from = config.get<string>("mail.from") ?? "";

    this.enabled = Boolean(host && user && pass && this.from);

    if (!this.enabled) {
      this.logger.warn(
        "MAIL_* env vars not fully set — outgoing emails will be logged, not delivered",
      );
      return;
    }

    this.transporter = createTransport({
      host,
      port: port ?? 587,
      secure: false,
      auth: { user: user!, pass: pass! },
    });
  }

  async sendPasswordReset(
    email: string,
    newPassword: string,
    locale = "en",
  ): Promise<void> {
    const template = TEMPLATES[locale] ?? TEMPLATES.en;

    if (!this.enabled || !this.transporter) {
      // Fallback for local/dev when SMTP creds are missing — keeps the
      // event flow alive without pretending the email was sent.
      this.logger.log(
        `[mail-stub] would send password reset to ${email} (locale=${locale}): ${newPassword}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: template.subject,
        text: template.bodyText(newPassword),
        html: template.bodyHtml(newPassword),
      });
      this.logger.log(`Password-reset email delivered to ${email}`);
    } catch (err) {
      this.logger.error(
        `Failed to deliver password-reset email to ${email}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }
}
