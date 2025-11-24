import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class CertificateVerificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Verify certificate by verification code (public endpoint)
   */
  async verifyCertificate(verificationCode: string) {
    // Validate UUID format before querying
    if (!this.isValidUUID(verificationCode)) {
      throw new BadRequestException('Invalid certificate verification code');
    }

    try {
      const certificate = await this.prisma.certificate.findUnique({
        where: { verificationCode },
        include: {
          certificateTemplate: {
            select: {
              name: true,
            },
          },
          applicantProcess: {
            include: {
              applicant: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              process: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!certificate) {
        throw new NotFoundException('Certificate not found');
      }

    // Check if expired
    const now = new Date();
    let status: 'valid' | 'expired' | 'forever';
    if (certificate.expiryDate === null) {
      status = 'forever';
    } else if (certificate.expiryDate < now) {
      status = 'expired';
    } else {
      status = 'valid';
    }

    // Update isExpired flag if needed
    if (certificate.isExpired !== (status === 'expired')) {
      await this.prisma.certificate.update({
        where: { id: certificate.id },
        data: { isExpired: status === 'expired' },
      });
    }

    const applicantName = certificate.applicantProcess.applicant
      ? `${certificate.applicantProcess.applicant.firstName || ''} ${certificate.applicantProcess.applicant.lastName || ''}`.trim()
      : 'Unknown';

    return {
      valid: status !== 'expired',
      certificate: {
        certificateNumber: certificate.certificateNumber,
        applicantName,
        issueDate: certificate.issueDate.toISOString().split('T')[0],
        expiryDate: certificate.expiryDate
          ? certificate.expiryDate.toISOString().split('T')[0]
          : null,
        status,
        processName: certificate.applicantProcess.process?.name || 'Unknown Process',
        templateName: certificate.certificateTemplate?.name || 'Unknown Template',
      },
    };
    } catch (error: any) {
      // Handle Prisma UUID validation errors
      if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
        throw new BadRequestException('Invalid certificate verification code');
      }
      // Re-throw other errors
      throw error;
    }
  }
}

