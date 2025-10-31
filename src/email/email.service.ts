import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import BaseEmailTemplate from 'emails/BaseEmailTemplate';
import OtpEmailTemplate from 'emails/OtpEmailTemplate';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../db/prisma.service';
import { JobService } from '../job/job.service';
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private frontendUrl: string;
  private emailFrom: string;

  constructor(
    private configService: ConfigService,
    private jobService: JobService,
    private prisma: PrismaService,
  ) {
    const emailConfig = this.configService.get<{
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
      from: string;
      frontendUrl: string;
    }>('email');

    if (emailConfig) {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth:
          emailConfig.auth?.user && emailConfig.auth.pass
            ? emailConfig.auth
            : undefined,
        tls: {
          rejectUnauthorized: false, // TODO: consider security implications
        },
      });
      this.frontendUrl = emailConfig.frontendUrl;
      this.emailFrom = emailConfig.from;
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${error.message}`,
        error.stack,
      );
      // Do not rethrow to prevent job retries for failed sends
    }
  }

  async sendEmail(email: string, text: string) {
    try {
      const emailHtml = await render(
        BaseEmailTemplate({
          text,
          title: 'UzaForms Notification',
          preview: text.substring(0, 100),
        }),
      );

      await this.jobService.sendEmail({
        to: email,
        subject: text,
        html: emailHtml,
      });
    } catch (error) {
      this.logger.error(
        `Failed to prepare or send email to ${email}: ${error.message}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Do not rethrow other errors to avoid breaking the calling process
    }
  }

  async sendOtpEmail(email: string, otp: string, purpose?: string) {
    try {
      const emailHtml = await render(
        OtpEmailTemplate({
          otp,
          purpose: purpose || 'email verification',
        }),
      );

      const subject = purpose === 'password_reset' 
        ? 'Password Reset Verification Code'
        : 'Email Verification Code - UzaForms';

      await this.jobService.sendEmail({
        to: email,
        subject,
        html: emailHtml,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send OTP email to ${email}: ${error.message}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
    }
  }
}
