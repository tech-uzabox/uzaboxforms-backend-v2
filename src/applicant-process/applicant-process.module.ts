import { Module } from '@nestjs/common';
import { ApplicantProcessService } from './applicant-process.service';
import { ApplicantProcessController } from './applicant-process.controller';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { ExportModule } from 'src/export/export.module';

@Module({
  imports: [EmailModule, NotificationModule, ExportModule],
  providers: [ApplicantProcessService],
  controllers: [ApplicantProcessController]
})
export class ApplicantProcessModule {}
