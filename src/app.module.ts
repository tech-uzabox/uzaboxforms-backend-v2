import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
  Module,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  APP_FILTER,
  APP_INTERCEPTOR,
  APP_PIPE,
  BaseExceptionFilter,
} from '@nestjs/core';
import {
  ZodSerializationException,
  ZodSerializerInterceptor,
  ZodValidationPipe,
} from 'nestjs-zod';
import { ZodError } from 'zod';
import { ApplicantProcessModule } from './applicant-process/applicant-process.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './db/prisma.module';
import { EmailModule } from './email/email.module';
import { ExportModule } from './export/export.module';
import { FileModule } from './file/file.module';
import { FilesModule } from './files/files.module';
import { FormResponseModule } from './form-response/form-response.module';
import { FormModule } from './form/form.module';
import { FolderModule } from './folder/folder.module';
import { ProcessFolderModule } from './process-folder/process-folder.module';
import { GroupRoleModule } from './group-role/group-role.module';
import { GroupModule } from './group/group.module';
import { JobModule } from './job/job.module';
import { OtpModule } from './otp/otp.module';
import { ProcessCommentModule } from './process-comment/process-comment.module';
import { ProcessRoleModule } from './process-role/process-role.module';
import { ProcessSendbackModule } from './process-sendback/process-sendback.module';
import { ProcessModule } from './process/process.module';
import { ProcessedApplicationModule } from './processed-application/processed-application.module';
import { RoleModule } from './role/role.module';
import { UserRoleModule } from './user-role/user-role.module';
import { UserModule } from './user/user.module';

import { AddToDatabaseModule } from './add-to-database/add-to-database.module';
import { AddToDatabaseTreeItemModule } from './add-to-database-tree-item/add-to-database-tree-item.module';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import emailConfig from './config/email.config';
import googleConfig from './config/google.config';
import jwtConfig from './config/jwt.config';
import s3Config from './config/s3.config';
import { DashboardModule } from './dashboard/dashboard.module';
import { IncomingApplicationModule } from './incoming-application/incoming-application.module';
import { ManagementModule } from './management/management.module';
import { OrganizationModule } from './organization/organization.module';
import { QrCodeModule } from './qr-code/qr-code.module';
import { ReportingModule } from './reporting/reporting.module';
import { WidgetModule } from './widget/widget.module';
import { SeedingModule } from './seeds/seeding.module';
import { CertificateModule } from './certificate/certificate.module';

@Catch(HttpException)
class HttpExceptionFilter extends BaseExceptionFilter {
  private logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    if (exception instanceof ZodSerializationException) {
      const zodError = exception.getZodError();

      if (zodError instanceof ZodError) {
        this.logger.error(`ZodSerializationException: ${zodError.message}`);
      }
    }

    super.catch(exception, host);
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [googleConfig, jwtConfig, s3Config, emailConfig],
      isGlobal: true,
    }),
    PrismaModule,
    EmailModule,
    JobModule,
    FileModule,
    FilesModule,
    AuthModule,
    ExportModule,
    RoleModule,
    UserModule,
    UserRoleModule,
    OtpModule,
    GroupModule,
    GroupRoleModule,
    FolderModule,
    ProcessFolderModule,
    FormModule,
    FormResponseModule,
    ProcessModule,
    ApplicantProcessModule,
    ProcessCommentModule,
    ProcessSendbackModule,
    ProcessRoleModule,
    ProcessedApplicationModule,
    CertificateModule,

    IncomingApplicationModule,
    AiModule,
    OrganizationModule,
    DashboardModule,
    WidgetModule,
    AnalyticsModule,
    QrCodeModule,
    ManagementModule,
    AddToDatabaseModule,
    AddToDatabaseTreeItemModule,
    ReportingModule,
    SeedingModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
