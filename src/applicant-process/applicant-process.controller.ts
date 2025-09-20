import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApplicantProcessService } from './applicant-process.service';
import { CreateApplicantProcessDto } from './dto/create-applicant-process.dto';
import { UpdateApplicantProcessDto } from './dto/update-applicant-process.dto';
import { BulkCreateApplicantProcessDto } from './dto/bulk-create-applicant-process.dto';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Applicant Processes')
@Controller('applicant-processes')
@UseGuards(JwtAuthGuard)
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

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('excelFile', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroEnabled.12'
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xls, .xlsx, .xlsm) are allowed'), false);
      }
    }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Bulk create applicant processes from Excel file',
    type: BulkCreateApplicantProcessDto,
  })
  bulkCreate(
    @Body() bulkCreateApplicantProcessDto: BulkCreateApplicantProcessDto,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: any,
  ) {
    return this.applicantProcessService.bulkCreate(bulkCreateApplicantProcessDto, file, user.id);
  }
}
