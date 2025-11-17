import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class CertificateVerificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verify certificate by verification code (public endpoint)
   */
  async verifyCertificate(verificationCode: string) {
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
  }
}

