import { Module } from '@nestjs/common';
import { FolderService } from './folder.service';
import { FolderController } from './folder.controller';

@Module({
  providers: [FolderService],
  controllers: [FolderController],
  exports: [FolderService],
})
export class FolderModule {}
