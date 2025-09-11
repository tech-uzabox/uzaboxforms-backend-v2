import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QrCodeDocument } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class QrCodeService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(
    data: Prisma.QrCodeDocumentCreateInput,
  ): Promise<QrCodeDocument> {
    const newQrCodeDocument = await this.prisma.qrCodeDocument.create({ data });
    await this.auditLogService.log({
      userId: newQrCodeDocument.creatorId,
      action: 'QR_CODE_DOCUMENT_CREATED',
      resource: 'QrCodeDocument',
      resourceId: newQrCodeDocument.id,
      status: 'SUCCESS',
      details: {
        documentName: newQrCodeDocument.documentName,
        qrCodeId: newQrCodeDocument.qrCodeId,
      },
    });
    return newQrCodeDocument;
  }

  async findAll(): Promise<QrCodeDocument[]> {
    return this.prisma.qrCodeDocument.findMany();
  }

  async findOne(id: string): Promise<QrCodeDocument | null> {
    return this.prisma.qrCodeDocument.findUnique({ where: { id } });
  }

  async findByQrCodeId(qrCodeId: string): Promise<QrCodeDocument | null> {
    const doc = await this.prisma.qrCodeDocument.findFirst({
      where: { qrCodeId },
    });
    if (!doc) {
      await this.auditLogService.log({
        action: 'QR_CODE_DOCUMENT_NOT_FOUND',
        resource: 'QrCodeDocument',
        resourceId: qrCodeId,
        status: 'FAILURE',
        errorMessage: 'QR Code Document not found.',
      });
      throw new NotFoundException(
        `QR Code Document with ID ${qrCodeId} not found.`,
      );
    }
    await this.auditLogService.log({
      action: 'QR_CODE_DOCUMENT_RETRIEVED',
      resource: 'QrCodeDocument',
      resourceId: doc.id,
      status: 'SUCCESS',
      details: { qrCodeId: doc.qrCodeId },
    });
    return doc;
  }

  async update(
    id: string,
    data: Prisma.QrCodeDocumentUpdateInput,
  ): Promise<QrCodeDocument> {
    const updatedDoc = await this.prisma.qrCodeDocument.update({
      where: { id },
      data,
    });
    await this.auditLogService.log({
      action: 'QR_CODE_DOCUMENT_UPDATED',
      resource: 'QrCodeDocument',
      resourceId: updatedDoc.id,
      status: 'SUCCESS',
      details: { documentName: updatedDoc.documentName, changes: data },
    });
    return updatedDoc;
  }

  async remove(id: string): Promise<QrCodeDocument> {
    const deletedDoc = await this.prisma.qrCodeDocument.delete({
      where: { id },
    });
    await this.auditLogService.log({
      action: 'QR_CODE_DOCUMENT_DELETED',
      resource: 'QrCodeDocument',
      resourceId: deletedDoc.id,
      status: 'SUCCESS',
      details: { documentName: deletedDoc.documentName },
    });
    return deletedDoc;
  }

  async findByCreatorId(creatorId: string): Promise<QrCodeDocument[]> {
    return this.prisma.qrCodeDocument.findMany({ where: { creatorId } });
  }
}
