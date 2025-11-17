import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { CreateCertificateTemplateDto } from './dto/create-certificate-template.dto';
import { UpdateCertificateTemplateDto } from './dto/update-certificate-template.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';

@Injectable()
export class CertificateTemplateService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(
    data: CreateCertificateTemplateDto,
    userId: string,
  ) {
    // Validate process exists
    const process = await this.prisma.process.findUnique({
      where: { id: data.processId },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    // Check if template already exists for this process
    const existingTemplate = await this.prisma.certificateTemplate.findUnique({
      where: { processId: data.processId },
    });

    if (existingTemplate) {
      throw new BadRequestException(
        'Certificate template already exists for this process',
      );
    }

    // Validate approval condition form exists if provided
    if (data.approvalCondition?.formId) {
      const form = await this.prisma.form.findUnique({
        where: { id: data.approvalCondition.formId },
      });

      if (!form) {
        throw new NotFoundException(
          'Form specified in approval condition not found',
        );
      }
    }

    // Validate validity configuration
    if (data.validityType === 'FIXED_YEARS' && !data.validityYears) {
      throw new BadRequestException(
        'validityYears is required when validityType is FIXED_YEARS',
      );
    }

    if (data.validityType === 'CUSTOM' && !data.customValidityDays) {
      throw new BadRequestException(
        'customValidityDays is required when validityType is CUSTOM',
      );
    }

    const template = await this.prisma.certificateTemplate.create({
      data: {
        processId: data.processId,
        name: data.name,
        templateFileUrl: data.templateFileUrl,
        certificateNumberFormat: data.certificateNumberFormat,
        approvalCondition: data.approvalCondition,
        enableCertificateGeneration: data.enableCertificateGeneration,
        validityType: data.validityType,
        validityYears: data.validityYears,
        customValidityDays: data.customValidityDays,
        isActive: data.isActive,
      },
      include: {
        process: true,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'CERTIFICATE_TEMPLATE_CREATED',
      resource: 'CertificateTemplate',
      resourceId: template.id,
      status: 'SUCCESS',
      details: { name: template.name, processId: data.processId },
    });

    return template;
  }

  async findAll(processId?: string) {
    const where: any = {};

    if (processId) {
      where.processId = processId;
    }

    return this.prisma.certificateTemplate.findMany({
      where,
      include: {
        process: {
          select: {
            id: true,
            name: true,
          },
        },
        fieldMappings: true,
        _count: {
          select: {
            certificates: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id },
      include: {
        process: true,
        fieldMappings: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sourceForm: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Certificate template not found');
    }

    return template;
  }

  async findByProcess(processId: string) {
    return this.prisma.certificateTemplate.findUnique({
      where: {
        processId,
      },
      include: {
        fieldMappings: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sourceForm: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: UpdateCertificateTemplateDto,
    userId: string,
  ) {
    const existing = await this.prisma.certificateTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Certificate template not found');
    }

    // Validate validity configuration
    const validityType = data.validityType ?? existing.validityType;
    if (validityType === 'FIXED_YEARS' && !data.validityYears && !existing.validityYears) {
      throw new BadRequestException(
        'validityYears is required when validityType is FIXED_YEARS',
      );
    }

    if (validityType === 'CUSTOM' && !data.customValidityDays && !existing.customValidityDays) {
      throw new BadRequestException(
        'customValidityDays is required when validityType is CUSTOM',
      );
    }

    // Validate approval condition form exists if provided
    if (data.approvalCondition?.formId) {
      const form = await this.prisma.form.findUnique({
        where: { id: data.approvalCondition.formId },
      });

      if (!form) {
        throw new NotFoundException(
          'Form specified in approval condition not found',
        );
      }
    }

    const updated = await this.prisma.certificateTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        process: true,
        fieldMappings: {
          include: {
            sourceForm: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'CERTIFICATE_TEMPLATE_UPDATED',
      resource: 'CertificateTemplate',
      resourceId: id,
      status: 'SUCCESS',
      details: { changes: data },
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.certificateTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Certificate template not found');
    }

    await this.prisma.certificateTemplate.delete({
      where: { id },
    });

    await this.auditLogService.log({
      userId,
      action: 'CERTIFICATE_TEMPLATE_DELETED',
      resource: 'CertificateTemplate',
      resourceId: id,
      status: 'SUCCESS',
    });

    return { message: 'Certificate template deleted successfully' };
  }
}

