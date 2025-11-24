import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { File } from 'db/client';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { AuthenticatedUser } from 'src/auth/decorators/get-user.decorator';
import { PrismaService } from 'src/db/prisma.service';
import { FileService } from 'src/file/file.service';
import { Readable } from 'stream';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: FileService,
    private auditLogService: AuditLogService,
    private configService: ConfigService,
  ) {}

  private generateSignedUrl(file: File): string {
    if (!file.isPrivate) {
      return `/files/serve/by-id/${file.id}`;
    }

    const secret = this.configService.get<string>('jwt.secret');
    if (!secret) {
      throw new InternalServerErrorException('JWT secret is not configured.');
    }

    const expires = Math.floor(Date.now() / 1000) + 5 * 60; // 5 minutes
    const dataToSign = `${file.id}${expires}`;
    const signature = createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    return `/files/serve/signed/${file.id}?expires=${expires}&signature=${signature}`;
  }

  async getPresignedUrlById(fileId: string): Promise<{ presignedUrl: string }> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      await this.auditLogService.log({
        action: 'GET_PRESIGNED_URL_BY_ID',
        resource: 'File',
        resourceId: fileId,
        status: 'FAILURE',
        errorMessage: 'File not found.',
      });
      throw new NotFoundException('File not found');
    }
    await this.auditLogService.log({
      action: 'GET_PRESIGNED_URL_BY_ID',
      resource: 'File',
      resourceId: fileId,
      status: 'SUCCESS',
    });
    return { presignedUrl: this.generateSignedUrl(file) };
  }

  async getPresignedUrlByFileUrl(
    fileUrl: string,
    bucket?: 'private' | 'public',
  ): Promise<{ presignedUrl: string }> {
    let file = await this.prisma.file.findFirst({
      where: { fileUrl },
    });

    if (!file) {
      file = await this.prisma.file.findFirst({
        where: {
          OR: [
            { fileUrl: { endsWith: fileUrl } },
            { fileUrl: { contains: fileUrl } },
            { thumbnailUrl: { endsWith: fileUrl } },
            { thumbnailUrl: { contains: fileUrl } },
          ],
        },
      });
    }

    if (!file) {
      const bucketsToTry = bucket ? [bucket] : ['private', 'public'];
      let lastError: any = null;
      
      for (const tryBucket of bucketsToTry) {
        try {
          const presignedUrl = await this.s3Service.getPresignedUrl(
            tryBucket,
            fileUrl,
          );
          await this.auditLogService.log({
            action: 'GET_PRESIGNED_URL_BY_FILE_URL_DIRECT',
            resource: 'File',
            resourceId: fileUrl,
            status: 'SUCCESS',
            details: { bucket: tryBucket, fileUrl },
          });
          return { presignedUrl };
        } catch (error: any) {
          lastError = error;
          continue;
        }
      }

      await this.auditLogService.log({
        action: 'GET_PRESIGNED_URL_BY_FILE_URL_DIRECT',
        resource: 'File',
        resourceId: fileUrl,
        status: 'FAILURE',
        errorMessage: lastError?.message || 'File not found in any bucket',
        details: { bucketsTried: bucketsToTry, fileUrl },
      });
      throw new NotFoundException(
        `File not found in MinIO storage. Tried buckets: ${bucketsToTry.join(', ')}, Key: ${fileUrl}. Error: ${lastError?.message || 'File not found in any bucket'}`,
      );
    }

    await this.auditLogService.log({
      action: 'GET_PRESIGNED_URL_BY_FILE_URL',
      resource: 'File',
      resourceId: fileUrl,
      status: 'SUCCESS',
    });
    return { presignedUrl: this.generateSignedUrl(file) };
  }

  private verifySignedUrl(
    fileId: string,
    expires: number,
    signature: string,
  ): boolean {
    const secret = this.configService.get<string>('jwt.secret');
    if (!secret) {
      throw new InternalServerErrorException('JWT secret is not configured.');
    }

    if (Date.now() / 1000 > expires) {
      return false; // URL has expired
    }

    const dataToSign = `${fileId}${expires}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    return signature === expectedSignature;
  }

  async getStreamForSignedFile(
    fileId: string,
    expires: number,
    signature: string,
  ): Promise<{ file: File; stream: Readable }> {
    if (!this.verifySignedUrl(fileId, expires, signature)) {
      await this.auditLogService.log({
        action: 'GET_STREAM_FOR_SIGNED_FILE',
        resource: 'File',
        resourceId: fileId,
        status: 'FAILURE',
        errorMessage: 'Invalid or expired URL.',
      });
      throw new UnauthorizedException('Invalid or expired URL.');
    }

    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      await this.auditLogService.log({
        action: 'GET_STREAM_FOR_SIGNED_FILE',
        resource: 'File',
        resourceId: fileId,
        status: 'FAILURE',
        errorMessage: 'File not found.',
      });
      throw new NotFoundException('File not found.');
    }

    try {
      const stream = await this.s3Service.getFileStream(
        file.isPrivate ? 'private' : 'public',
        file.fileUrl,
      );
      await this.auditLogService.log({
        action: 'GET_STREAM_FOR_SIGNED_FILE',
        resource: 'File',
        resourceId: fileId,
        status: 'SUCCESS',
      });
      return { file, stream };
    } catch (error) {
      await this.auditLogService.log({
        action: 'GET_STREAM_FOR_SIGNED_FILE',
        resource: 'File',
        resourceId: fileId,
        status: 'FAILURE',
        errorMessage: error.message,
      });
      throw new InternalServerErrorException(
        'Failed to retrieve file content from storage.',
      );
    }
  }

  async uploadFile(
    newFile: Express.Multer.File,
    isPrivate: boolean,
    userId: string,
  ) {
    try {
      if (!newFile) throw new NotFoundException('File not found');

      const key = await this.s3Service.uploadFilePrivate(
        newFile,
        isPrivate ? 'private' : 'public',
      );

      const file = await this.prisma.file.create({
        data: {
          fileUrl: key,
          size: Number(newFile.size),
          title: newFile.originalname,
          fileType: newFile.mimetype,
          userId,
          isPrivate,
        },
      });
      await this.auditLogService.log({
        userId,
        action: 'UPLOAD_FILE',
        resource: 'File',
        resourceId: file.id,
        status: 'SUCCESS',
      });

      return {
        ...file,
        presignedUrl: await this.s3Service.getPresignedUrl(
          isPrivate ? 'private' : 'public',
          key,
        ),
      };
    } catch (error) {
      await this.auditLogService.log({
        userId,
        action: 'UPLOAD_FILE_FOUND',
        resource: 'File',
        status: 'FAILURE',
        errorMessage: error.message,
      });
      throw error;
    }
  }
  async deleteFile(id: string, userId: string) {
    try {
      const file = await this.prisma.file.findUnique({ where: { id } });
      if (!file) throw new NotFoundException('File not found');
      if (file.userId !== userId) throw new ForbiddenException();

      await this.s3Service.deleteObject(
        file.isPrivate ? 'private' : 'public',
        file.fileUrl,
      );
      await this.prisma.file.delete({ where: { id } });
      await this.auditLogService.log({
        userId,
        action: 'FILE_DELETE',
        resource: 'File',
        resourceId: id,
        status: 'SUCCESS',
      });
      return { success: true };
    } catch (error) {
      await this.auditLogService.log({
        userId,
        action: 'File_DELETE',
        resource: 'File',
        resourceId: id,
        status: 'FAILURE',
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async findOne(
    FileId: string,
    requestingUserId: string,
    actor: AuthenticatedUser,
  ): Promise<File & { presignedUrl: string }> {
    const file = await this.prisma.file.findUnique({ where: { id: FileId } });

    if (!file) {
      await this.auditLogService.log({
        userId: actor.id,
        action: 'GET_FILE_NOT_FOUND',
        resource: 'File',
        resourceId: FileId,
        status: 'FAILURE',
        errorMessage: 'File not found.',
      });
      throw new NotFoundException(`File with ID ${FileId} not found.`);
    }

    if (file.userId !== requestingUserId) {
      await this.auditLogService.log({
        userId: actor.id,
        action: 'GET_FILE_UNAUTHORIZED',
        resource: 'File',
        resourceId: FileId,
        status: 'FAILURE',
        errorMessage: 'Unauthorized access.',
      });
      throw new ForbiddenException(
        'You are not authorized to access this File.',
      );
    }
    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_FILE',
      resource: 'File',
      resourceId: FileId,
      status: 'SUCCESS',
    });
    return {
      ...file,
      presignedUrl: await this.s3Service.getPresignedUrl(
        file.isPrivate ? 'private' : 'public',
        file.fileUrl,
      ),
    };
  }

  async getFileByFileUrl(
    fileUrl: string,
    requestingUserId: string | undefined,
    actor: AuthenticatedUser | undefined,
  ): Promise<{ file: File; stream: Readable }> {
    const file = await this.prisma.file.findFirst({
      where: { OR: [{ fileUrl: fileUrl }, { thumbnailUrl: fileUrl }] },
    });

    if (!file) {
      await this.auditLogService.log({
        userId: actor?.id,
        action: 'GET_FILE_BY_URL_NOT_FOUND',
        resource: 'File',
        resourceId: fileUrl,
        status: 'FAILURE',
        errorMessage: `File with URL ${fileUrl} not found in database.`,
      });
      throw new NotFoundException(
        `File with URL ${fileUrl} not found in database. The file may exist in storage but not be registered in the database.`,
      );
    }

    if (file.isPrivate) {
      await this.auditLogService.log({
        userId: actor?.id,
        action: 'GET_FILE_BY_URL_UNAUTHORIZED',
        resource: 'File',
        resourceId: fileUrl,
        status: 'FAILURE',
        errorMessage: 'Unauthorized access.',
      });
      throw new ForbiddenException(
        'You are not authorized to access this private File.',
      );
    }
    if (file.fileUrl !== fileUrl && !file.thumbnailUrl) {
      await this.auditLogService.log({
        userId: actor?.id,
        action: 'GET_FILE_BY_URL_THUMBNAIL_NOT_FOUND',
        resource: 'File',
        resourceId: fileUrl,
        status: 'FAILURE',
        errorMessage: 'Thumbnail for file not found.',
      });
      throw new NotFoundException(`Thumbnail for file not found.`);
    }
    const actualFileUrl = file.fileUrl === fileUrl ? file.fileUrl : (file.thumbnailUrl ?? '');
    const bucket = file.isPrivate ? 'private' : 'public';
    
    let fileStream: Readable;
    try {
      fileStream = await this.s3Service.getFileStream(
        bucket,
        actualFileUrl,
      );
      await this.auditLogService.log({
        userId: actor?.id,
        action: 'GET_FILE_BY_URL',
        resource: 'File',
        resourceId: fileUrl,
        status: 'SUCCESS',
      });
    } catch (error: any) {
      await this.auditLogService.log({
        userId: actor?.id,
        action: 'GET_FILE_BY_URL',
        resource: 'File',
        resourceId: fileUrl,
        status: 'FAILURE',
        errorMessage: error?.message || 'Unknown error',
      });
      throw error;
    }

    return { file, stream: fileStream };
  }
  async getFileById(
    id: string,
    requestingUserId: string | undefined,
    actor: AuthenticatedUser | undefined,
  ): Promise<{ file: File; stream: Readable }> {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      await this.auditLogService.log({
        userId: actor?.id,
        action: 'GET_FILE_BY_ID_NOT_FOUND',
        resource: 'File',
        resourceId: id,
        status: 'FAILURE',
        errorMessage: 'File not found.',
      });
      throw new NotFoundException(`File with URL not found.`);
    }

    // if (file.isPrivate && file.userId !== requestingUserId) {
    //   await this.auditLogService.log({
    //     userId: actor?.id,
    //     action: 'GET_FILE_BY_ID_UNAUTHORIZED',
    //     resource: 'File',
    //     resourceId: id,
    //     status: 'FAILURE',
    //     errorMessage: 'Unauthorized access.',
    //   });
    //   throw new ForbiddenException(
    //     'You are not authorized to access this private File.',
    //   );
    // }

    let fileStream: Readable;
    try {
      fileStream = await this.s3Service.getFileStream(
        file.isPrivate ? 'private' : 'public',
        file.fileUrl,
      );
      await this.auditLogService.log({
        userId: actor?.id,
        action: 'GET_FILE_BY_ID',
        resource: 'File',
        resourceId: id,
        status: 'SUCCESS',
      });
    } catch (error) {
      await this.auditLogService.log({
        userId: actor?.id,
        action: 'GET_FILE_BY_ID',
        resource: 'File',
        resourceId: id,
        status: 'FAILURE',
        errorMessage: error.message,
      });
      throw new InternalServerErrorException(
        'Failed to retrieve file content from storage.',
      );
    }

    return { file, stream: fileStream };
  }
}
