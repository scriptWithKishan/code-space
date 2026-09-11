import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const user = this.configService.get<string>('ZOHO_SMTP_USER');
    const pass = this.configService.get<string>('ZOHO_SMTP_PASS');
    const customHost = this.configService.get<string>('ZOHO_SMTP_HOST');
    const customPort = this.configService.get<string>('ZOHO_SMTP_PORT');

    if (user && pass) {
      // Determine correct Zoho SMTP host based on domain region (.in vs .eu vs .com)
      let host = customHost;
      if (!host) {
        const lowerUser = user.toLowerCase();
        if (lowerUser.endsWith('.in')) {
          host = 'smtp.zoho.in';
        } else if (lowerUser.endsWith('.eu')) {
          host = 'smtp.zoho.eu';
        } else if (lowerUser.endsWith('.com.au')) {
          host = 'smtp.zoho.com.au';
        } else {
          host = 'smtp.zoho.com';
        }
      }

      const port = Number(customPort) || 465;

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      this.logger.log(`[MailService] Initialized Zoho SMTP transport (${host}:${port}) for ${user}`);
    } else {
      this.logger.warn(
        '[MailService] ZOHO_SMTP_USER or ZOHO_SMTP_PASS not provided. Fallback to console logger mode for email invitations.',
      );
    }
  }

  async sendWorkspaceInvite(
    to: string,
    workspaceName: string,
    inviteUrl: string,
    inviterName: string,
  ): Promise<void> {
    const user = this.configService.get<string>('ZOHO_SMTP_USER');
    const from =
      this.configService.get<string>('ZOHO_SMTP_FROM') ||
      user ||
      'noreply@code-space.ai';

    const subject = `You've been invited to join ${workspaceName} on AI Code-Space`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #111;">Join ${workspaceName} on AI Code-Space</h2>
        <p style="color: #444; font-size: 16px;">
          <strong>${inviterName}</strong> has invited you to collaborate in the <strong>${workspaceName}</strong> workspace.
        </p>
        <div style="margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #888; font-size: 14px;">
          If the button above does not work, copy and paste this link into your browser:<br/>
          <a href="${inviteUrl}" style="color: #0066cc;">${inviteUrl}</a>
        </p>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"AI Code-Space" <${from}>`,
          to,
          subject,
          html,
        });
        this.logger.log(`[MailService] Sent invitation email to ${to} for workspace "${workspaceName}"`);
      } catch (error: any) {
        this.logger.error(`[MailService] Failed to send email via Zoho SMTP to ${to}: ${error?.message || error}`);
        throw error;
      }
    } else {
      this.logger.log(`\n================= EMAIL INVITATION (DEV CONSOLE) =================`);
      this.logger.log(`To: ${to}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log(`Invite URL: ${inviteUrl}`);
      this.logger.log(`===================================================================\n`);
    }
  }
}
