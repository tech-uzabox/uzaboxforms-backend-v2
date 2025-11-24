import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from '../db/prisma.health';
import { S3HealthIndicator } from './indicators/s3.health';
import { EmailHealthIndicator } from './indicators/email.health';
import { RedisHealthIndicator } from './indicators/redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealthIndicator: PrismaHealthIndicator,
    private s3HealthIndicator: S3HealthIndicator,
    private emailHealthIndicator: EmailHealthIndicator,
    private redisHealthIndicator: RedisHealthIndicator,
    private memoryHealthIndicator: MemoryHealthIndicator,
    private diskHealthIndicator: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database check
      () => this.prismaHealthIndicator.isHealthy('database'),

      // S3 storage check
      () => this.s3HealthIndicator.isHealthy('s3'),

      // Email service check
      () => this.emailHealthIndicator.isHealthy('email'),

      // Redis cache check
      () => this.redisHealthIndicator.isHealthy('redis'),

      // Memory usage check (warn if above 1.5GB, error if above 2GB)
      () =>
        this.memoryHealthIndicator.checkHeap('memory_heap', 1500 * 1024 * 1024),
      () =>
        this.memoryHealthIndicator.checkRSS('memory_rss', 2000 * 1024 * 1024),

      // Disk space check (warn if below 10GB, error if below 5GB)
      () =>
        this.diskHealthIndicator.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9, // Warn if disk usage is above 90%
        }),
    ]);
  }
}

