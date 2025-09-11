import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProcessService } from './process.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { SubmitProcessFormDto } from './dto/submit-process-form.dto';
import { DuplicateProcessDto } from './dto/duplicate-process.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Processes')
@Controller('processes')
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
}