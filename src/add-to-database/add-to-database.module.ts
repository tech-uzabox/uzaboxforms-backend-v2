import { Module } from '@nestjs/common';
import { AddToDatabaseService } from './add-to-database.service';
import { AddToDatabaseController } from './add-to-database.controller';

@Module({
  controllers: [AddToDatabaseController],
  providers: [AddToDatabaseService],
  exports: [AddToDatabaseService],
})
export class AddToDatabaseModule {}
