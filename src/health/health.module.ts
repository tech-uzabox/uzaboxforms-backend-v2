import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../db/prisma.module';
import { HealthController } from './health.controller';
import { S3HealthIndicator } from './indicators/s3.health';
import { EmailHealthIndicator } from './indicators/email.health';
import { RedisHealthIndicator } from './indicators/redis.health';

@Module({
  imports: [TerminusModule, ConfigModule, PrismaModule],
  controllers: [HealthController],
  providers: [
    S3HealthIndicator,
    EmailHealthIndicator,
    RedisHealthIndicator,
  ],
})
export class HealthModule {}

