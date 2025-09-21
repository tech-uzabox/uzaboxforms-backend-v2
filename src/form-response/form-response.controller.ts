import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { FormResponseService } from './form-response.service';
import { CreateFormResponseDto } from './dto/create-form-response.dto';
import { UpdateFormResponseDto } from './dto/update-form-response.dto';
import { SubmitFormResponseDto } from './dto/submit-form-response.dto';
import { SubmitPublicFormResponseDto } from './dto/submit-public-form-response.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Form Responses')
@Controller('responses')
export class FormResponseController {
  constructor(private readonly formResponseService: FormResponseService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createFormResponseDto: CreateFormResponseDto) {
    return this.formResponseService.create(createFormResponseDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.formResponseService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.formResponseService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateFormResponseDto: UpdateFormResponseDto) {
    return this.formResponseService.update(id, updateFormResponseDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.formResponseService.remove(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  submitResponse(@Body() submitFormResponseDto: SubmitFormResponseDto) {
    return this.formResponseService.submitResponse(
      submitFormResponseDto.formId,
      submitFormResponseDto.applicantProcessId,
      submitFormResponseDto.responses,
    );
  }

  @Post('public')
  submitPublicResponse(@Body() submitPublicFormResponseDto: SubmitPublicFormResponseDto) {
    return this.formResponseService.submitPublicResponse(
      submitPublicFormResponseDto.formId,
      submitPublicFormResponseDto.responses,
    );
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  getResponsesByUserId(@Param('userId') userId: string) {
    return this.formResponseService.findByUserId(userId);
  }

  @Get(':userId/:formId/:applicantProcessId')
  @UseGuards(JwtAuthGuard)
  getResponseByUserIdAndFormId(
    @Param('userId') userId: string,
    @Param('formId') formId: string,
    @Param('applicantProcessId') applicantProcessId: string,
  ) {
    return this.formResponseService.findByUserIdAndFormId(userId, formId, applicantProcessId);
  }
}
