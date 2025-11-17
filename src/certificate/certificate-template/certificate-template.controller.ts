import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../../auth/decorators/get-user.decorator';
import { CertificateTemplateService } from './certificate-template.service';
import { CreateCertificateTemplateDto } from './dto/create-certificate-template.dto';
import { UpdateCertificateTemplateDto } from './dto/update-certificate-template.dto';
import { FileService } from '../../file/file.service';

@ApiTags('Certificate Templates')
@Controller('certificate-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CertificateTemplateController {
  constructor(
    private readonly certificateTemplateService: CertificateTemplateService,
    private readonly fileService: FileService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a certificate template' })
  @ApiResponse({ status: 201, description: 'Certificate template created successfully.' })
  create(
    @Body() createCertificateTemplateDto: CreateCertificateTemplateDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.certificateTemplateService.create(
      createCertificateTemplateDto,
      user.id,
    );
  }

  @Post('upload-template')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload PDF template file' })
  @ApiResponse({ status: 200, description: 'Template uploaded successfully.' })
  async uploadTemplate(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const { fileKey } = await this.fileService.uploadFile(file, 'private');
    return {
      fileUrl: fileKey,
      fileName: file.originalname,
      size: file.size,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all certificate templates' })
  @ApiResponse({ status: 200, description: 'List of certificate templates.' })
  findAll(@Query('processId') processId?: string) {
    return this.certificateTemplateService.findAll(processId);
  }

  @Get('process/:processId')
  @ApiOperation({ summary: 'Get certificate template by process' })
  @ApiResponse({ status: 200, description: 'Certificate template found.' })
  findByProcess(@Param('processId') processId: string) {
    return this.certificateTemplateService.findByProcess(processId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a certificate template by ID' })
  @ApiResponse({ status: 200, description: 'Certificate template found.' })
  @ApiResponse({ status: 404, description: 'Certificate template not found.' })
  findOne(@Param('id') id: string) {
    return this.certificateTemplateService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a certificate template' })
  @ApiResponse({ status: 200, description: 'Certificate template updated successfully.' })
  update(
    @Param('id') id: string,
    @Body() updateCertificateTemplateDto: UpdateCertificateTemplateDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.certificateTemplateService.update(
      id,
      updateCertificateTemplateDto,
      user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a certificate template' })
  @ApiResponse({ status: 200, description: 'Certificate template deleted successfully.' })
  remove(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.certificateTemplateService.remove(id, user.id);
  }
}

