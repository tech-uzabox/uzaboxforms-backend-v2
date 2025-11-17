import { Module } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';
import { CertificateTemplateService } from './certificate-template/certificate-template.service';
import { CertificateTemplateController } from './certificate-template/certificate-template.controller';
import { CertificateFieldMappingService } from './certificate-field-mapping/certificate-field-mapping.service';
import { CertificateGeneratorService } from './certificate-generator/certificate-generator.service';
import { CertificateVerificationService } from './certificate-verification/certificate-verification.service';
import { CertificateVerificationController } from './certificate-verification/certificate-verification.controller';
import { CertificateFieldMappingController } from './certificate-field-mapping/certificate-field-mapping.controller';
import { PrismaModule } from '../db/prisma.module';
import { FileModule } from '../file/file.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, FileModule, AuditLogModule],
  controllers: [
    CertificateController,
    CertificateTemplateController,
    CertificateFieldMappingController,
    CertificateVerificationController,
  ],
  providers: [
    CertificateService,
    CertificateTemplateService,
    CertificateFieldMappingService,
    CertificateGeneratorService,
    CertificateVerificationService,
  ],
  exports: [CertificateService, CertificateGeneratorService],
})
export class CertificateModule {}

