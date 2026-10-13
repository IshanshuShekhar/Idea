import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface EmailProviderError extends Error {
  code?: number | string;
  response?: {
    statusCode?: number;
    body?: {
      errors?: Array<{ message?: string }>;
    };
  };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly isConfigured: boolean;
  private readonly isDemoMode: boolean;
  private readonly fromEmail: string;

  constructor() {
    this.isDemoMode = !process.env.SENDGRID_API_KEY && process.env.DEMO_MODE === 'true';
    this.isConfigured = !!process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'ishanshushekhar@gmail.com';

    if (this.isConfigured) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
      this.logger.log('SendGrid API key configured.');
    } else if (this.isDemoMode) {
      this.logger.warn('SendGrid not configured — running in DEMO_MODE (emails will be skipped).');
    } else {
      this.logger.warn('SendGrid not configured and DEMO_MODE is not true. Email sends will fail.');
    }
  }

  /** Whether SendGrid is configured and ready to send */
  get canSend(): boolean {
    return this.isConfigured;
  }

  /** Whether we're in demo/fallback mode */
  get isDemo(): boolean {
    return this.isDemoMode;
  }

  /**
   * Send an email via SendGrid.
   *
   * @returns `true` if the email was accepted by SendGrid (HTTP 2xx),
   *          `false` if sending was skipped (demo mode) or failed.
   * @throws  Only re-throws if `throwOnFailure` is true AND it's a real failure
   *          (not a 202-masked-as-exception edge case).
   */
  async send(
    options: SendEmailOptions,
    { throwOnFailure = false }: { throwOnFailure?: boolean } = {},
  ): Promise<boolean> {
    if (this.isDemoMode) {
      this.logger.warn(`[DEMO] Email skipped → to: ${options.to}, subject: "${options.subject}"`);
      return false;
    }

    if (!this.isConfigured) {
      this.logger.error(`SendGrid not configured. Cannot send email to ${options.to}.`);
      if (throwOnFailure) {
        throw new Error('Email delivery is not configured.');
      }
      return false;
    }

    try {
      this.logger.log(
        `Sending email → to: ${options.to}, subject: "${options.subject}".`,
      );

      const [response] = await sgMail.send({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      this.logger.log(`SendGrid accepted. HTTP ${response?.statusCode} → ${options.to}`);
      return true;
    } catch (error: unknown) {
      const providerError = error as EmailProviderError;
      const statusCode = providerError.code || providerError.response?.statusCode;
      const responseMessages = providerError.response?.body?.errors
        ?.map(({ message }) => message)
        .filter((message): message is string => Boolean(message));
      const details = responseMessages?.join('; ')
        || (error instanceof Error ? error.message : 'Unknown email provider error');
      this.logger.error(
        `SendGrid error → ${options.to}. Status: ${statusCode ?? 'unknown'}. Details: ${details}`,
      );

      // SendGrid sometimes throws on 202 (accepted) — treat as success
      if (statusCode === 202 || statusCode === 200 || details.includes('202')) {
        this.logger.warn(`Exception with success status (${statusCode}) — treating as delivered.`);
        return true;
      }

      if (throwOnFailure) {
        throw new Error(
          `Email provider rejected the request${providerError.response?.statusCode
            ? ` (HTTP ${providerError.response.statusCode})`
            : ''}: ${details}`,
        );
      }
      return false;
    }
  }
}
