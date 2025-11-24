import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { CertificateService } from './certificate.service';
import { FileService } from '../file/file.service';

@ApiTags('Certificates')
@Controller('certificates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CertificateController {
  constructor(
    private readonly certificateService: CertificateService,
    private readonly fileService: FileService,
  ) {}

  @Get('applicant-process/:applicantProcessId')
  @ApiOperation({ summary: 'Get certificates for an applicant process' })
  @ApiResponse({ status: 200, description: 'List of certificates.' })
  getCertificatesByApplicantProcess(
    @Param('applicantProcessId') applicantProcessId: string,
  ) {
    return this.certificateService.getCertificatesByApplicantProcess(
      applicantProcessId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certificate by ID' })
  @ApiResponse({ status: 200, description: 'Certificate found.' })
  @ApiResponse({ status: 404, description: 'Certificate not found.' })
  getCertificateById(@Param('id') id: string) {
    return this.certificateService.getCertificateById(id);
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Get certificate download URL' })
  @ApiResponse({ status: 200, description: 'Download URL generated.' })
  async getDownloadUrl(@Param('id') id: string) {
    const { fileUrl } = await this.certificateService.getCertificateDownloadUrl(id);
    const presignedUrl = await this.fileService.getPresignedUrl('private', fileUrl);
    return {
      downloadUrl: presignedUrl,
      expiresIn: 300, // 5 minutes
    };
  }
}

