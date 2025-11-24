import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { CreateFieldMappingDto } from './dto/create-field-mapping.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';

@Injectable()
export class CertificateFieldMappingService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: CreateFieldMappingDto, userId: string) {
    // Verify template exists
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id: data.certificateTemplateId },
    });

    if (!template) {
      throw new NotFoundException('Certificate template not found');
    }

    // Validate sourceFormId if provided
    if (data.sourceFormId) {
      const form = await this.prisma.form.findUnique({
        where: { id: data.sourceFormId },
      });

      if (!form) {
        throw new NotFoundException('Source form not found');
      }
    }

    const mapping = await this.prisma.certificateFieldMapping.create({
      data: {
        certificateTemplateId: data.certificateTemplateId,
        fieldType: data.fieldType,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        fontSize: data.fontSize,
        fontFamily: data.fontFamily,
        color: data.color,
        alignment: data.alignment,
        sourceFormId: data.sourceFormId,
        sourceQuestionId: data.sourceQuestionId,
        label: data.label,
      },
      include: {
        sourceForm: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'CERTIFICATE_FIELD_MAPPING_CREATED',
      resource: 'CertificateFieldMapping',
      resourceId: mapping.id,
      status: 'SUCCESS',
      details: { fieldType: data.fieldType, templateId: data.certificateTemplateId },
    });

    return mapping;
  }

  async findAll(templateId: string) {
    return this.prisma.certificateFieldMapping.findMany({
      where: { certificateTemplateId: templateId },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const mapping = await this.prisma.certificateFieldMapping.findUnique({
      where: { id },
    });

    if (!mapping) {
      throw new NotFoundException('Field mapping not found');
    }

    return mapping;
  }

  async update(id: string, data: Partial<CreateFieldMappingDto>, userId: string) {
    const existing = await this.prisma.certificateFieldMapping.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Field mapping not found');
    }

    const updated = await this.prisma.certificateFieldMapping.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'CERTIFICATE_FIELD_MAPPING_UPDATED',
      resource: 'CertificateFieldMapping',
      resourceId: id,
      status: 'SUCCESS',
      details: { changes: data },
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.certificateFieldMapping.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Field mapping not found');
    }

    await this.prisma.certificateFieldMapping.delete({
      where: { id },
    });

    await this.auditLogService.log({
      userId,
      action: 'CERTIFICATE_FIELD_MAPPING_DELETED',
      resource: 'CertificateFieldMapping',
      resourceId: id,
      status: 'SUCCESS',
    });

    return { message: 'Field mapping deleted successfully' };
  }

  async removeByTemplate(templateId: string, userId: string) {
    await this.prisma.certificateFieldMapping.deleteMany({
      where: { certificateTemplateId: templateId },
    });

    await this.auditLogService.log({
      userId,
      action: 'CERTIFICATE_FIELD_MAPPINGS_DELETED',
      resource: 'CertificateTemplate',
      resourceId: templateId,
      status: 'SUCCESS',
      details: { templateId },
    });

    return { message: 'All field mappings deleted successfully' };
  }
}

