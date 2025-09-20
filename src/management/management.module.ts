import { Module } from '@nestjs/common';
import { ManagementController } from './management.controller';
import { ManagementService } from './management.service';
import { FileService } from '../file/file.service';

@Module({
  controllers: [ManagementController],
  providers: [ManagementService, FileService]
})
export class ManagementModule {}
