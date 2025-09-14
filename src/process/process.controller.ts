import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProcessService, ProcessWithRoles } from './process.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { SubmitProcessFormDto } from './dto/submit-process-form.dto';
import { DuplicateProcessDto } from './dto/duplicate-process.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Processes')
@Controller('processes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcessController {
  constructor(private readonly processService: ProcessService) {}

  @Post()
  create(@Body() createProcessDto: CreateProcessDto) {
    return this.processService.create(createProcessDto);
  }

  @Get()
  findAll() {
    return this.processService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.processService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProcessDto: UpdateProcessDto) {
    return this.processService.update(id, updateProcessDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.processService.remove(id);
  }

  @Post('submit-form/:processId')
  submitProcessForm(
    @Param('processId') processId: string,
    @Body() submitProcessFormDto: SubmitProcessFormDto,
  ) {
    return this.processService.submitProcessForm(processId, submitProcessFormDto);
  }

  @Post('duplicate')
  duplicate(@Body() duplicateProcessDto: DuplicateProcessDto) {
    return this.processService.duplicate(duplicateProcessDto.processId, duplicateProcessDto.creatorId);
  }

  @Get('process-forms/:processId/:userId')
  getProcessFormsByProcessIdAndUserId(
    @Param('processId') processId: string,
    @Param('userId') userId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.processService.getProcessFormsByProcessIdAndUserId(processId, userId, user);
  }

  @Get('process-form/:processId/:formId')
  getProcessForm(
    @Param('processId') processId: string,
    @Param('formId') formId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.processService.getProcessForm(processId, formId, user);
  }
}
