import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key = 'redis'): Promise<HealthIndicatorResult> {
    let client: Redis | null = null;
    try {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);

      // Check if Redis is configured
      if (!host) {
        return this.getStatus(key, false, {
          message: 'Redis configuration is incomplete',
        });
      }

      // Create a temporary client for health check
      client = new Redis({
        host,
        port,
        retryStrategy: () => null, // Disable retry for health checks
        maxRetriesPerRequest: 1,
        connectTimeout: 5000, // 5 second timeout
        lazyConnect: false, // Connect immediately
      });

      // Perform PING operation with timeout
      const result = await Promise.race([
        client.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000),
        ),
      ]);

      // Disconnect the temporary client
      client.disconnect();

      if (result === 'PONG') {
        return this.getStatus(key, true, {
          host,
          port,
        });
      } else {
        throw new Error('Redis PING did not return PONG');
      }
    } catch (error) {
      // Ensure client is disconnected even on error
      if (client) {
        try {
          client.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, {
          message:
            error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}

