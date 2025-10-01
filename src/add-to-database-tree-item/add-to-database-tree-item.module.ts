import { Module } from '@nestjs/common';
import { AddToDatabaseTreeItemService } from './add-to-database-tree-item.service';
import { AddToDatabaseTreeItemController } from './add-to-database-tree-item.controller';
import { PrismaModule } from '../db/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AddToDatabaseTreeItemController],
  providers: [AddToDatabaseTreeItemService],
  exports: [AddToDatabaseTreeItemService],
})
export class AddToDatabaseTreeItemModule {}
