import { Module } from '@nestjs/common';
import { ProcessFolderService } from './process-folder.service';
import { ProcessFolderController } from './process-folder.controller';
import { PrismaService } from '../db/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Module({
  controllers: [ProcessFolderController],
  providers: [ProcessFolderService, PrismaService, AuditLogService],
  exports: [ProcessFolderService],
})
export class ProcessFolderModule {}

