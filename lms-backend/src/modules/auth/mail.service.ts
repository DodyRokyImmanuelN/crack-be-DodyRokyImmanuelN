import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT', 2525),
      auth: {
        user: this.configService.getOrThrow('MAIL_USER'),
        pass: this.configService.getOrThrow('MAIL_PASS'),
      },
    });
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('RESET_PASSWORD_URL')}?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get('MAIL_FROM'),
        to: email,
        subject: 'Reset Password - LMS',
        html: `
          <h2>Reset Password</h2>
          <p>You received this email because a password reset was requested for your account.</p>
          <p>Click the link below to reset your password (valid for <strong>15 minutes</strong>):</p>
          <a href="${resetUrl}" style="
            background-color: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            margin: 16px 0;
          ">Reset Password</a>
          <p>If you did not request a password reset, please ignore this email.</p>
        `,
      });
      this.logger.log(`Reset password email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send reset password email to ${email}`, error);
      throw error;
    }
  }
}