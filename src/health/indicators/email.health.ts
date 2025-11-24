import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    HealthCheckError,
    HealthIndicator,
    HealthIndicatorResult,
} from '@nestjs/terminus';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailHealthIndicator extends HealthIndicator {
  private requestCount = 0;
  private cachedResult: HealthIndicatorResult | null = null;
  private readonly CHECK_INTERVAL = 500;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key = 'email'): Promise<HealthIndicatorResult> {
    // Increment request counter
    this.requestCount++;

    // Check if we should perform a fresh check
    const shouldCheck = this.requestCount % this.CHECK_INTERVAL === 0;

    // If we have a cached result and don't need to check, return it
    if (!shouldCheck && this.cachedResult) {
      return this.cachedResult;
    }

    // Perform the actual health check
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
        const result = this.getStatus(key, false, {
          message: 'Email configuration is incomplete',
        });
        this.cachedResult = result;
        return result;
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

      const result = this.getStatus(key, true, {
        host: emailConfig.host,
        port: emailConfig.port,
      });
      this.cachedResult = result;
      return result;
    } catch (error) {
      const result = this.getStatus(key, false, {
        message:
          error instanceof Error ? error.message : 'Unknown error',
      });
      this.cachedResult = result;
      throw new HealthCheckError('Email check failed', result);
    }
  }
}

