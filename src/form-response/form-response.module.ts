import { Module } from '@nestjs/common';
import { FormResponseService } from './form-response.service';
import { FormResponseController } from './form-response.controller';

@Module({
  providers: [FormResponseService],
  controllers: [FormResponseController]
})
export class FormResponseModule {}
