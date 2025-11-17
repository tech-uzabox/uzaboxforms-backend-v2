import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CertificateVerificationService } from './certificate-verification.service';

@ApiTags('Certificate Verification')
@Controller('certificates/verify')
export class CertificateVerificationController {
  constructor(
    private readonly certificateVerificationService: CertificateVerificationService,
  ) {}

  @Get(':verificationCode')
  @ApiOperation({ summary: 'Verify certificate authenticity (Public endpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Certificate verification result.',
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found.',
  })
  verify(@Param('verificationCode') verificationCode: string) {
    return this.certificateVerificationService.verifyCertificate(verificationCode);
  }
}

