import { Module } from '@nestjs/common';
import { FormService } from './form.service';
import { FormController } from './form.controller';
import { FormFieldsController } from './form-fields.controller';
import { FormFieldsService } from './form-fields.service';
import { FormGenerationService } from './form-generation.service';

@Module({
  providers: [FormService, FormFieldsService, FormGenerationService],
  controllers: [FormController, FormFieldsController],
  exports: [FormGenerationService]
})
export class FormModule {}
