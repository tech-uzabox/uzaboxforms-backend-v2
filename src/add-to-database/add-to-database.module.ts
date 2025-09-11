import { Module } from '@nestjs/common';
import { AddToDatabaseController } from './add-to-database.controller';
import { AddToDatabaseService } from './add-to-database.service';

@Module({
  controllers: [AddToDatabaseController],
  providers: [AddToDatabaseService]
})
export class AddToDatabaseModule {}
