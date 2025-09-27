import { Injectable, NotFoundException } from '@nestjs/common';
import { Management } from 'db/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { FileService } from '../file/file.service';

@Injectable()
export class ManagementService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private fileService: FileService,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    type: 'HEADER' | 'FOOTER',
    userId?: string,
  ): Promise<Management> {
    // Upload file to S3 and get public URL
    const fileUrl = await this.fileService.uploadImagePublic(file);

    // Delete existing images of the same type
    await this.prisma.management.deleteMany({
      where: { type },
    });

    const newImage = await this.prisma.management.create({
      data: {
        fileName: file.originalname,
        fileUrl,
        type,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'MANAGEMENT_IMAGE_UPLOADED',
      resource: 'Management',
      resourceId: newImage.id,
      status: 'SUCCESS',
      details: { fileName: file.originalname, type, fileUrl },
    });

    return newImage;
  }

  async deleteImage(
    fileName: string,
    type: 'HEADER' | 'FOOTER',
    userId?: string,
  ): Promise<void> {
    const deletedImage = await this.prisma.management.deleteMany({
      where: { fileName, type },
    });

    if (deletedImage.count === 0) {
      throw new NotFoundException(
        `Image with fileName ${fileName} and type ${type} not found`,
      );
    }

    await this.auditLogService.log({
      userId,
      action: 'MANAGEMENT_IMAGE_DELETED',
      resource: 'Management',
      status: 'SUCCESS',
      details: { fileName, type },
    });
  }

  async getAllImages(): Promise<Management[]> {
    return this.prisma.management.findMany({
      orderBy: { uploadedAt: 'desc' },
    });
  }
}
