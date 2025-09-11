import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApplicantProcessService } from './applicant-process.service';
import { CreateApplicantProcessDto } from './dto/create-applicant-process.dto';
import { UpdateApplicantProcessDto } from './dto/update-applicant-process.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Applicant Processes')
@Controller('applicant-processes')
export class ApplicantProcessController {
  constructor(private readonly applicantProcessService: ApplicantProcessService) {}

  @Post()
  create(@Body() createApplicantProcessDto: CreateApplicantProcessDto) {
    return this.applicantProcessService.create(createApplicantProcessDto);
  }

  @Get()
  findAll() {
    return this.applicantProcessService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicantProcessService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateApplicantProcessDto: UpdateApplicantProcessDto) {
    return this.applicantProcessService.update(id, updateApplicantProcessDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.applicantProcessService.remove(id);
  }

  @Get('by-user/:userId')
  getApplicationsByUserId(@Param('userId') userId: string) {
    return this.applicantProcessService.findByUserId(userId);
  }
}