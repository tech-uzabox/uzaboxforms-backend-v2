import { Module } from '@nestjs/common';
import { ManagementController } from './management.controller';
import { ManagementService } from './management.service';
import { FileService } from '../file/file.service';
import { FileModule } from 'src/file/file.module';

@Module({
  imports: [FileModule],
  controllers: [ManagementController],
  providers: [ManagementService]
})
export class ManagementModule {}
