import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Readable } from 'stream';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JobService } from '../job/job.service';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrlBase: string;

  constructor(
    private configService: ConfigService,
    private auditLogService: AuditLogService,
    private jobService: JobService
  ) {
    const endpoint = this.configService.get<string>('s3.endpoint');
    const region = this.configService.get<string>('s3.region');
    const accessKeyId = this.configService.get<string>('s3.accessKeyId');
    const secretAccessKey =
      this.configService.get<string>('s3.secretAccessKey');
    this.bucketName = this.configService.get<string>('s3.bucket') || '';
    this.publicUrlBase =
      this.configService.get<string>('s3.publicUrlBase') || '';

    if (
      !endpoint ||
      !region ||
      !accessKeyId ||
      !secretAccessKey ||
      !this.bucketName ||
      !this.publicUrlBase
    ) {
      this.logger.error(
        'S3 configuration is incomplete. Check environment variables.',
      );
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

    this.logger.log(
      `S3 Service initialized for bucket: ${this.bucketName} at endpoint: ${endpoint}`,
    );
  }

  async getFileStream(
    folder: 'private' | 'public',
    key: string,
  ): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: folder,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (response.Body instanceof Readable) {
        return response.Body;
      } else {
        throw new Error(
          'S3 GetObjectCommand response body is not a readable stream.',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error retrieving file stream from S3 for key ${key}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new InternalServerErrorException(
        'Failed to retrieve file stream from storage.',
      );
    }
  }

  async getFileContent(
    folder: 'private' | 'public',
    key: string,
  ): Promise<Buffer> {
    try {
      this.logger.debug(
        `Retrieving file content for key: ${key} from folder: ${folder}`,
      );
      const stream = await this.getFileStream(folder, key);
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      let streamError: Error | null = null;

      // Add error handling for the stream
      stream.on('error', (error) => {
        streamError = error;
        this.logger.error(
          `Stream error while reading file ${key}: ${error.message}`,
        );
      });

      // Collect chunks with better validation
      for await (const chunk of stream) {
        if (streamError) {
          throw streamError;
        }

        if (!Buffer.isBuffer(chunk)) {
          this.logger.warn(
            `Non-buffer chunk received for file ${key}, converting...`,
          );
          chunks.push(Buffer.from(chunk));
        } else {
          chunks.push(chunk);
        }
        totalBytes += chunk.length;

        // Sanity check for extremely large files (>100MB)
        if (totalBytes > 100 * 1024 * 1024) {
          throw new Error(`File ${key} is too large: ${totalBytes} bytes`);
        }
      }

      if (streamError) {
        throw streamError;
      }

      if (chunks.length === 0) {
        throw new Error(`No data received for file ${key}`);
      }

      const buffer = Buffer.concat(chunks);
      this.logger.debug(
        `Successfully retrieved file ${key}: ${buffer.length} bytes`,
      );

      // Verify buffer integrity
      if (buffer.length !== totalBytes) {
        throw new Error(
          `Buffer size mismatch for file ${key}: expected ${totalBytes}, got ${buffer.length}`,
        );
      }

      return buffer;
    } catch (error) {
      this.logger.error(
        `Error retrieving file content from S3 for key ${key}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new InternalServerErrorException(
        `Failed to retrieve file content from storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    bucket: 'private' | 'public',
  ): Promise<{ fileKey: string; thumbnailUrl?: string }> {
    const fileKey = `${randomUUID()}${extname(file.originalname)}`;
    try {
      // Upload original file
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: fileKey,
          Body: Buffer.from(file.buffer),
          ContentType: file.mimetype,
          ...(bucket === 'public' ? { ACL: 'public-read' } : {}),
        }),
      );
      this.logger.log(
        `File uploaded successfully: ${fileKey} to bucket: ${bucket}`,
      );
      await this.auditLogService.log({
        action: 'FILE_UPLOAD',
        resource: 'File',
        resourceId: fileKey,
        status: 'SUCCESS',
        details: { fileName: file.originalname, bucket: bucket, size: file.size },
      });

      return { fileKey };
    } catch (error) {
      this.logger.error(
        `Error uploading file ${fileKey} to S3:`,
        error instanceof Error ? error.stack : 'Unknown error',
      );
      await this.auditLogService.log({
        action: 'FILE_UPLOAD',
        resource: 'File',
        resourceId: fileKey,
        status: 'FAILURE',
        errorMessage: error.message,
      });
      throw new InternalServerErrorException(
        'Failed to upload file to storage.',
      );
    }
  }

  async uploadFilePrivate(
    file: Express.Multer.File,
    bucket: 'private' | 'public',
  ): Promise<string> {
    const key = `${randomUUID()}${extname(file.originalname)}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(file.buffer),
        ContentType: file.mimetype,
      }),
    );

    return key;
  }
  async uploadImagePublic(file: Express.Multer.File): Promise<string> {
    const { fileKey } = await this.uploadFile(file, this.bucketName as 'private' | 'public');
    return `${this.publicUrlBase}/${this.bucketName}/${fileKey}`;
  }

  async getPresignedUrl(bucket: string, key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn: 60 * 5 });
    } catch (error) {
      this.logger.error(
        `Error generating presigned URL for key ${key}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      await this.auditLogService.log({
        action: 'GET_PRESIGNED_URL',
        resource: 'File',
        resourceId: key,
        status: 'FAILURE',
        errorMessage: error.message,
      });
      throw new InternalServerErrorException(
        'Failed to generate presigned URL.',
      );
    }
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
      this.logger.log(`Deleted object ${key} from bucket ${bucket}`);
      await this.auditLogService.log({
        action: 'FILE_DELETE_OBJECT',
        resource: 'File',
        resourceId: key,
        status: 'SUCCESS',
        details: { bucket: bucket },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting object ${key} from bucket ${bucket}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      await this.auditLogService.log({
        action: 'FILE_DELETE_OBJECT',
        resource: 'File',
        resourceId: key,
        status: 'FAILURE',
        errorMessage: error.message,
      });
      throw new InternalServerErrorException(
        'Failed to delete object from storage.',
      );
    }
  }

  async replaceFile(
    bucket: string,
    key: string,
    file: Express.Multer.File,
  ): Promise<string> {
    await this.deleteObject(bucket, key);
    const { fileKey } = await this.uploadFile(
      file,
      bucket as 'private' | 'public',
    );
    await this.auditLogService.log({
      action: 'FILE_REPLACE',
      resource: 'File',
      resourceId: key,
      status: 'SUCCESS',
      details: { newFileKey: fileKey, bucket: bucket, originalFileName: file.originalname },
    });
    return fileKey;
  }

  async processFileForFormGeneration(
    file: Express.Multer.File,
    userId: string
  ): Promise<string> {
    try {
      this.logger.log(`Queuing file for form generation: ${file.originalname} for user: ${userId}`);

      const jobResult = await this.jobService.processFile({
        file: {
          buffer: file.buffer,
          originalname: file.originalname,
        },
        userId,
      });

      const jobId = 'file-processing-' + Date.now();

      await this.auditLogService.log({
        action: 'FILE_PROCESSING_QUEUED',
        resource: 'File',
        resourceId: jobId,
        status: 'SUCCESS',
        details: {
          fileName: file.originalname,
          userId,
          jobId
        },
      });

      return jobId;
    } catch (error) {
      this.logger.error(
        `Error queuing file for processing: ${file.originalname}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      await this.auditLogService.log({
        action: 'FILE_PROCESSING_QUEUED',
        resource: 'File',
        resourceId: 'unknown',
        status: 'FAILURE',
        errorMessage: error.message,
      });
      throw new InternalServerErrorException(
        'Failed to queue file for processing.',
      );
    }
  }
}
