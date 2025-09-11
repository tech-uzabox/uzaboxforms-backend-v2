import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FormResponseService } from './form-response.service';
import { CreateFormResponseDto } from './dto/create-form-response.dto';
import { UpdateFormResponseDto } from './dto/update-form-response.dto';
import { SubmitFormResponseDto } from './dto/submit-form-response.dto';
import { SubmitPublicFormResponseDto } from './dto/submit-public-form-response.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Form Responses')
@Controller('form-responses')
export class FormResponseController {
  constructor(private readonly formResponseService: FormResponseService) {}

  @Post()
  create(@Body() createFormResponseDto: CreateFormResponseDto) {
    return this.formResponseService.create(createFormResponseDto);
  }

  @Get()
  findAll() {
    return this.formResponseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formResponseService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFormResponseDto: UpdateFormResponseDto) {
    return this.formResponseService.update(id, updateFormResponseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formResponseService.remove(id);
  }

  @Post('submit')
  submitResponse(@Body() submitFormResponseDto: SubmitFormResponseDto) {
    return this.formResponseService.submitResponse(
      submitFormResponseDto.formId,
      submitFormResponseDto.applicantProcessId,
      submitFormResponseDto.responses,
    );
  }

  @Post('submit-public')
  submitPublicResponse(@Body() submitPublicFormResponseDto: SubmitPublicFormResponseDto) {
    return this.formResponseService.submitPublicResponse(
      submitPublicFormResponseDto.formId,
      submitPublicFormResponseDto.responses,
    );
  }

  @Get('by-user/:userId')
  getResponsesByUserId(@Param('userId') userId: string) {
    return this.formResponseService.findByUserId(userId);
  }

  @Get('by-user-and-form/:userId/:formId')
  getResponseByUserIdAndFormId(
    @Param('userId') userId: string,
    @Param('formId') formId: string,
  ) {
    return this.formResponseService.findByUserIdAndFormId(userId, formId);
  }
}