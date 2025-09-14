import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FormService } from './form.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { DuplicateFormDto } from './dto/duplicate-form.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Forms')
@Controller('forms')
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Post()
  create(@Body() createFormDto: CreateFormDto) {
    return this.formService.create(createFormDto);
  }

  @Get()
  findAll() {
    return this.formService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFormDto: UpdateFormDto) {
    return this.formService.update(id, updateFormDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formService.remove(id);
  }

  @Post('duplicate')
  duplicate(@Body() duplicateFormDto: DuplicateFormDto) {
    return this.formService.duplicate(duplicateFormDto.formId, duplicateFormDto.creatorId);
  }

  @Get('with-countries')
  getFormsWithCountries() {
    return this.formService.getFormsWithCountries();
  }

  @Get('public')
  getPublicForms() {
    return this.formService.getPublicForms();
  }

  @Get(':id/fields')
  getFormFields(@Param('id') id: string) {
    return this.formService.getFormFields(id);
  }

  @Get('fields/multiple')
  getMultipleFormFields(@Query('formIds') formIds: string[]) {
    return this.formService.getMultipleFormFields(formIds);
  }
}
