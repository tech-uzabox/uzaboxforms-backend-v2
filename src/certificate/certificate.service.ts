import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CertificateGeneratorService } from './certificate-generator/certificate-generator.service';
import { CertificateTemplateService } from './certificate-template/certificate-template.service';

@Injectable()
export class CertificateService {
  constructor(
    private prisma: PrismaService,
    private certificateGenerator: CertificateGeneratorService,
    private certificateTemplateService: CertificateTemplateService,
  ) {}

  /**
   * Check if approval condition matches form responses
   * responses is now a map: { formId: formResponses }
   */
  evaluateApprovalCondition(
    approvalCondition: any,
    responsesByForm: Record<string, any>,
  ): boolean {
    if (!approvalCondition || !responsesByForm) {
      return false;
    }

    const { formId, questionId, operator, expectedValue } = approvalCondition;

    if (!formId) {
      return false;
    }

    // Get responses for the specified form
    const formResponses = responsesByForm[formId];
    if (!formResponses) {
      return false;
    }

    // Extract answer from form responses
    const answer = this.extractQuestionValue(formResponses, questionId);

    if (answer === null || answer === undefined) {
      return false;
    }

    // Compare based on operator
    switch (operator) {
      case 'equals':
        return String(answer).toLowerCase() === String(expectedValue).toLowerCase();
      case 'notEquals':
        return String(answer).toLowerCase() !== String(expectedValue).toLowerCase();
      case 'contains':
        return String(answer).toLowerCase().includes(String(expectedValue).toLowerCase());
      case 'greaterThan':
        return Number(answer) > Number(expectedValue);
      case 'lessThan':
        return Number(answer) < Number(expectedValue);
      default:
        return false;
    }
  }

  /**
   * Extract value from form responses by question ID
   */
  private extractQuestionValue(responses: any, questionId: string): string | null {
    if (!responses || typeof responses !== 'object') {
      return null;
    }

    // Responses structure: { sectionId: { sectionName, questions: { questionId: { response, ... } } } }
    for (const sectionId in responses) {
      const section = responses[sectionId];
      if (section && section.questions && section.questions[questionId]) {
        const question = section.questions[questionId];
        if (question.response !== undefined && question.response !== null) {
          return String(question.response);
        }
      }
    }

    return null;
  }

  /**
   * Generate certificate if conditions are met
   */
  async generateCertificateIfEligible(
    processId: string,
    formId: string,
    applicantProcessId: string,
    responses: any,
    applicantName: string,
    generatedBy: string,
  ): Promise<{ generated: boolean; certificateId?: string }> {
    // Check if certificate template exists and is enabled for this process
    const template = await this.certificateTemplateService.findByProcess(
      processId,
    );

    if (!template || !template.enableCertificateGeneration || !template.isActive) {
      return { generated: false };
    }

    // Check if certificate already exists for this applicant process
    const existing = await this.prisma.certificate.findFirst({
      where: {
        applicantProcessId,
        certificateTemplateId: template.id,
      },
    });

    if (existing) {
      return { generated: false, certificateId: existing.id };
    }

    // Get all form responses for this applicant process to evaluate condition
    const allFormResponses = await this.prisma.formResponse.findMany({
      where: {
        applicantProcessId,
        processId,
      },
    });

    // Build a map of formId -> responses for easy lookup
    const responsesByForm: Record<string, any> = {};
    allFormResponses.forEach((fr) => {
      responsesByForm[fr.formId] = fr.responses;
    });

    // Evaluate approval condition (condition includes formId)
    const conditionMet = this.evaluateApprovalCondition(
      template.approvalCondition,
      responsesByForm,
    );

    if (!conditionMet) {
      return { generated: false };
    }

    // Generate certificate with all form responses
    const result = await this.certificateGenerator.generateCertificate(
      template.id,
      applicantProcessId,
      responsesByForm,
      applicantName,
      generatedBy,
    );

    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationCode: result.verificationCode },
    });

    return { generated: true, certificateId: certificate?.id };
  }

  /**
   * Get certificates for an applicant process
   */
  async getCertificatesByApplicantProcess(applicantProcessId: string) {
    return this.prisma.certificate.findMany({
      where: { applicantProcessId },
      include: {
        certificateTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });
  }

  /**
   * Get certificate by ID
   */
  async getCertificateById(id: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        certificateTemplate: true,
        applicantProcess: {
          include: {
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return certificate;
  }

  /**
   * Get certificate download URL
   */
  async getCertificateDownloadUrl(certificateId: string) {
    const certificate = await this.getCertificateById(certificateId);
    // This would use FileService to get presigned URL
    // For now, return the file URL
    return {
      fileUrl: certificate.fileUrl,
      certificateNumber: certificate.certificateNumber,
    };
  }
}

