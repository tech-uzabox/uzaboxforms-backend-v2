import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import archiver from 'archiver';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly s3Client: S3Client;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('s3.endpoint');
    const region = this.configService.get<string>('s3.region');
    const accessKeyId = this.configService.get<string>('s3.accessKeyId');
    const secretAccessKey = this.configService.get<string>('s3.secretAccessKey');

    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
      this.logger.error('S3 configuration is incomplete');
      throw new InternalServerErrorException(
        'S3 service is not configured correctly.',
      );
    }

    this.s3Client = new S3Client({
      endpoint: endpoint,
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async createBackup(): Promise<NodeJS.ReadableStream> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      archive.on('error', (err) => {
        this.logger.error('Archive error:', err);
        throw new InternalServerErrorException('Failed to create backup archive');
      });

      await Promise.all([
        this.addDatabaseBackup(archive),
        this.addMinIOBackup(archive, 'private'),
        this.addMinIOBackup(archive, 'public'),
      ]);

      archive.finalize();

      return archive as unknown as NodeJS.ReadableStream;
    } catch (error) {
      this.logger.error('Error creating backup:', error);
      throw new InternalServerErrorException(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async addDatabaseBackup(archive: ReturnType<typeof archiver>): Promise<void> {
    try {
      const databaseUrl = this.configService.get<string>('DATABASE_URL');
      if (!databaseUrl) {
        this.logger.warn('DATABASE_URL not found, skipping database backup');
        return;
      }

      const dbUrl = new URL(databaseUrl);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password ? dbUrl.password.replace(/"/g, '\\"') : '';

      const pgDumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --no-owner --no-acl`;

      this.logger.log('Starting database backup...');
      const { stdout, stderr } = await execAsync(pgDumpCommand, {
        maxBuffer: 10 * 1024 * 1024,
      });

      if (stderr && !stderr.includes('WARNING')) {
        this.logger.warn('pg_dump stderr:', stderr);
      }

      archive.append(stdout, { name: 'database/backup.sql' });
      this.logger.log('Database backup added to archive');
    } catch (error) {
      this.logger.error('Error creating database backup:', error);
      archive.append(
        `-- Database backup failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
        { name: 'database/backup.sql' },
      );
    }
  }

  private async addMinIOBackup(
    archive: ReturnType<typeof archiver>,
    bucket: 'private' | 'public',
  ): Promise<void> {
    try {
      this.logger.log(`Starting MinIO backup for bucket: ${bucket}...`);

      let continuationToken: string | undefined;
      let objectCount = 0;

      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucket,
          ContinuationToken: continuationToken,
        });

        const listResponse = await this.s3Client.send(listCommand);
        const objects = listResponse.Contents || [];

        for (const object of objects) {
          if (!object.Key) continue;

          try {
            const getCommand = new GetObjectCommand({
              Bucket: bucket,
              Key: object.Key,
            });

            const getResponse = await this.s3Client.send(getCommand);

            if (getResponse.Body instanceof Readable) {
              archive.append(getResponse.Body, {
                name: `minio/${bucket}/${object.Key}`,
              });
              objectCount++;
            }
          } catch (error) {
            this.logger.warn(
              `Failed to backup object ${object.Key} from bucket ${bucket}:`,
              error instanceof Error ? error.message : 'Unknown error',
            );
          }
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      this.logger.log(
        `MinIO backup completed for bucket ${bucket}: ${objectCount} objects`,
      );
    } catch (error) {
      this.logger.error(
        `Error creating MinIO backup for bucket ${bucket}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  getBackupFilename(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `backup-${timestamp}.zip`;
  }
}
