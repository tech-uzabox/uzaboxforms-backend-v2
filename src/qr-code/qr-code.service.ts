import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QrCodeDocument } from 'db/client';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';

@Injectable()
export class QrCodeService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async generateQrCode(
    createQrCodeDto: CreateQrCodeDto,
    creatorId: string,
  ): Promise<{ qrCodeDataUrl: string; qrCodeId: string }> {
    const { documentName, host } = createQrCodeDto;

    const qrCodeId = uuidv4();
    const qrCodeUrl = `${host}/document/qr-code/${qrCodeId}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);

    // Create the document in DB
    const newQrCodeDocument = await this.prisma.qrCodeDocument.create({
      data: {
        documentName,
        fileName: documentName, // Use documentName as fileName for now
        qrCodeId,
        creator: {
          connect: { id: creatorId },
        },
      },
    });

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

    return { qrCodeDataUrl, qrCodeId };
  }

  async findAll(): Promise<QrCodeDocument[]> {
    return this.prisma.qrCodeDocument.findMany({
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<QrCodeDocument | null> {
    return this.prisma.qrCodeDocument.findUnique({ where: { id } });
  }

  async findByQrCodeId(qrCodeId: string): Promise<QrCodeDocument | null> {
    const doc = await this.prisma.qrCodeDocument.findFirst({
      where: { qrCodeId },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
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
    return this.prisma.qrCodeDocument.findMany({
      where: { creatorId },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
