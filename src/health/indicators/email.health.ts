import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key = 'email'): Promise<HealthIndicatorResult> {
    try {
      const emailConfig = this.configService.get<{
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      }>('email');

      // Check if email is configured
      if (!emailConfig || !emailConfig.host) {
        return this.getStatus(key, false, {
          message: 'Email configuration is incomplete',
        });
      }

      // Create transporter for verification
      const transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth:
          emailConfig.auth?.user && emailConfig.auth.pass
            ? emailConfig.auth
            : undefined,
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify SMTP connection
      await transporter.verify();

      return this.getStatus(key, true, {
        host: emailConfig.host,
        port: emailConfig.port,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Email check failed',
        this.getStatus(key, false, {
          message:
            error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}

