import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFiles, UseInterceptors, UseGuards, BadRequestException, Res } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ApplicantProcessService } from './applicant-process.service';
import { CreateApplicantProcessDto } from './dto/create-applicant-process.dto';
import { UpdateApplicantProcessDto } from './dto/update-applicant-process.dto';
import { BulkCreateApplicantProcessDto } from './dto/bulk-create-applicant-process.dto';
import { DownloadApplicantProcessDto } from './dto/download-applicant-process.dto';
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response } from 'express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Applicant Processes')
@Controller('applicant-processes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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
  update(
    @Param('id') id: string,
    @Body() updateApplicantProcessDto: UpdateApplicantProcessDto,
    @GetUser() user: AuthenticatedUser
  ) {
    return this.applicantProcessService.update(id, updateApplicantProcessDto, user.id);
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
  @UseInterceptors(FilesInterceptor('excelFiles', 50, {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
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
    description: 'Bulk create applicant processes from multiple Excel files',
    type: BulkCreateApplicantProcessDto,
  })
  async bulkCreate(
    @Body() bulkCreateApplicantProcessDto: BulkCreateApplicantProcessDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user: AuthenticatedUser,
  ) {
    const result = await this.applicantProcessService.bulkCreate(bulkCreateApplicantProcessDto, files, user.id);
    if (!result.success) {
      throw new BadRequestException(result);
    }
    return result;
  }

  @Post('download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download applicant process data in Excel format',
    description: 'Downloads all applicant process responses for a specific process and form in Excel format. File upload and signature columns will be included but remain empty.',
  })
  @ApiBody({
    description: 'Download parameters',
    type: DownloadApplicantProcessDto,
  })
  async download(
    @Body() downloadApplicantProcessDto: DownloadApplicantProcessDto,
    @Res() res: Response,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.applicantProcessService.downloadApplicantProcessData(
      downloadApplicantProcessDto,
      res,
      user.id,
    );
  }
}

