import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProcessCommentService } from './process-comment.service';
import { CreateProcessCommentDto } from './dto/create-process-comment.dto';
import { UpdateProcessCommentDto } from './dto/update-process-comment.dto';
import { SubmitProcessCommentDto } from './dto/submit-process-comment.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Process Comments')
@Controller('process-comments')
export class ProcessCommentController {
  constructor(private readonly processCommentService: ProcessCommentService) {}

  @Post()
  create(@Body() createProcessCommentDto: CreateProcessCommentDto) {
    return this.processCommentService.create(createProcessCommentDto);
  }

  @Get()
  findAll() {
    return this.processCommentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.processCommentService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProcessCommentDto: UpdateProcessCommentDto) {
    return this.processCommentService.update(id, updateProcessCommentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.processCommentService.remove(id);
  }

  @Post('submit')
  submitComment(@Body() submitProcessCommentDto: SubmitProcessCommentDto) {
    return this.processCommentService.submitComment(
      submitProcessCommentDto.applicantProcessId,
      submitProcessCommentDto.userId,
      submitProcessCommentDto.comment,
    );
  }

  @Get('by-applicant-process-and-form/:applicantProcessId/:formId')
  getCommentsByApplicantProcessIdAndFormId(
    @Param('applicantProcessId') applicantProcessId: string,
    @Param('formId') formId: string,
  ) {
    return this.processCommentService.findByApplicantProcessIdAndFormId(applicantProcessId, formId);
  }
}