import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3HealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key = 's3'): Promise<HealthIndicatorResult> {
    try {
      const endpoint = this.configService.get<string>('s3.endpoint');
      const region = this.configService.get<string>('s3.region');
      const accessKeyId = this.configService.get<string>('s3.accessKeyId');
      const secretAccessKey =
        this.configService.get<string>('s3.secretAccessKey');
      const bucketName = this.configService.get<string>('s3.bucket');

      // Check if S3 is configured
      if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucketName) {
        return this.getStatus(key, false, {
          message: 'S3 configuration is incomplete',
        });
      }

      // Create S3 client
      const s3Client = new S3Client({
        endpoint: endpoint,
        region: region,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
        forcePathStyle: true,
      });

      // Perform a lightweight operation to check connectivity
      await s3Client.send(new ListBucketsCommand({}));

      return this.getStatus(key, true, {
        endpoint,
        region,
        bucket: bucketName,
      });
    } catch (error) {
      throw new HealthCheckError(
        'S3 check failed',
        this.getStatus(key, false, {
          message:
            error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}

