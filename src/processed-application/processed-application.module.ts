import { Module } from '@nestjs/common';
import { ProcessedApplicationService } from './processed-application.service';
import { ProcessedApplicationController } from './processed-application.controller';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { CertificateModule } from '../certificate/certificate.module';

@Module({
  imports: [EmailModule, NotificationModule, CertificateModule],
  providers: [ProcessedApplicationService],
  controllers: [ProcessedApplicationController]
})
export class ProcessedApplicationModule {}