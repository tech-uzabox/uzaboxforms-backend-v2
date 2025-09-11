import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileService } from './file.service';
import { AuditLogModule } from 'src/audit-log/audit-log.module';
import { JobModule } from 'src/job/job.module';

@Global()
@Module({
  imports: [ConfigModule, AuditLogModule, JobModule],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
