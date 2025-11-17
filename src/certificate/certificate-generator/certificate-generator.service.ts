import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PDFDocument, PDFPage, rgb, StandardFonts, RGB } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../db/prisma.service';
import { FileService } from '../../file/file.service';
import { ConfigService } from '@nestjs/config';
import { format, addYears, addDays } from 'date-fns';

@Injectable()
export class CertificateGeneratorService {
  constructor(
    private prisma: PrismaService,
    private fileService: FileService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate certificate number based on format string
   */
  async generateCertificateNumber(
    formatString: string,
    processId: string,
    responsesByForm?: Record<string, any>,
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    let certificateNumber = formatString;

    // Replace placeholders
    certificateNumber = certificateNumber.replace(/{YEAR}/g, String(year));
    certificateNumber = certificateNumber.replace(/{MONTH}/g, month);
    certificateNumber = certificateNumber.replace(/{DAY}/g, day);
    certificateNumber = certificateNumber.replace(/{PROCESS_ID}/g, processId.substring(0, 8));
    certificateNumber = certificateNumber.replace(/{FORM_ID}/g, ''); // No longer used, but keep for backward compatibility
    certificateNumber = certificateNumber.replace(/{UUID}/g, uuidv4());

    // Handle SEQUENCE placeholder
    if (certificateNumber.includes('{SEQUENCE}')) {
      const sequencePrefix = certificateNumber.split('{SEQUENCE}')[0];
      const lastCertificate = await this.prisma.certificate.findFirst({
        where: {
          certificateNumber: {
            startsWith: sequencePrefix,
          },
        },
        orderBy: {
          generatedAt: 'desc',
        },
      });

      let sequence = 1;
      if (lastCertificate) {
        const match = lastCertificate.certificateNumber.match(/(\d+)$/);
        if (match) {
          sequence = parseInt(match[1], 10) + 1;
        }
      }

      certificateNumber = certificateNumber.replace(
        '{SEQUENCE}',
        String(sequence).padStart(4, '0'),
      );
    }

    // Handle {QUESTION_ID:formId:questionId} placeholders (formId is optional for backward compatibility)
    if (responsesByForm) {
      const questionIdRegex = /\{QUESTION_ID(?:[:]([^:}]+))?[:]([^}]+)\}/g;
      const matches = certificateNumber.matchAll(questionIdRegex);
      
      for (const match of matches) {
        const formId = match[1]; // Optional formId
        const questionId = match[2];
        
        // If formId is specified, use that form's responses, otherwise try all forms
        let value: string | null = null;
        if (formId && responsesByForm[formId]) {
          value = this.extractQuestionValue(responsesByForm[formId], questionId);
        } else {
          // Try all forms
          for (const formIdKey in responsesByForm) {
            value = this.extractQuestionValue(responsesByForm[formIdKey], questionId);
            if (value) break;
          }
        }
        
        certificateNumber = certificateNumber.replace(match[0], value || '');
      }
    }

    return certificateNumber;
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
   * Calculate expiry date based on validity configuration
   */
  calculateExpiryDate(
    validityType: 'FOREVER' | 'FIXED_YEARS' | 'CUSTOM',
    validityYears?: number | null,
    customValidityDays?: number | null,
    issueDate: Date = new Date(),
  ): { expiryDate: Date | null; isExpired: boolean } {
    let expiryDate: Date | null = null;

    switch (validityType) {
      case 'FOREVER':
        expiryDate = null;
        break;
      case 'FIXED_YEARS':
        if (validityYears) {
          expiryDate = addYears(issueDate, validityYears);
        }
        break;
      case 'CUSTOM':
        if (customValidityDays) {
          expiryDate = addDays(issueDate, customValidityDays);
        }
        break;
    }

    const isExpired = expiryDate ? expiryDate < new Date() : false;

    return { expiryDate, isExpired };
  }

  /**
   * Generate QR code data URL
   */
  async generateQRCode(verificationUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(verificationUrl);
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate QR code');
    }
  }

  /**
   * Generate certificate PDF
   * responsesByForm: { formId: formResponses } - responses from all forms in the process
   */
  async generateCertificate(
    templateId: string,
    applicantProcessId: string,
    responsesByForm: Record<string, any>,
    applicantName: string,
    generatedBy: string,
  ): Promise<{ certificateNumber: string; fileUrl: string; fileSize: number; verificationCode: string }> {
    // Get template with field mappings
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id: templateId },
      include: {
        fieldMappings: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sourceForm: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        process: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Certificate template not found');
    }

    // Generate certificate number
    const formatString = template.certificateNumberFormat as any;
    const format = typeof formatString === 'string' 
      ? formatString 
      : (formatString?.format || 'CERT-{YEAR}-{SEQUENCE}');
    
    const certificateNumber = await this.generateCertificateNumber(
      format,
      template.processId,
      responsesByForm,
    );

    // Calculate validity
    const issueDate = new Date();
    const { expiryDate, isExpired } = this.calculateExpiryDate(
      template.validityType,
      template.validityYears,
      template.customValidityDays,
      issueDate,
    );

    // Generate verification code
    const verificationCode = uuidv4();
    const host = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const verificationUrl = `${host}/certificate/verify/${verificationCode}`;

    // Load PDF template
    const templateBuffer = await this.fileService.getFileContent('private', template.templateFileUrl);
    const pdfDoc = await PDFDocument.load(templateBuffer);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Process field mappings
    for (const mapping of template.fieldMappings) {
      await this.renderField(
        firstPage,
        mapping,
        {
          name: applicantName,
          certificateNumber,
          issueDate,
          expiryDate,
          verificationUrl,
          responsesByForm,
        },
        width,
        height,
      );
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Upload to S3
    const fileName = `certificate-${certificateNumber}-${Date.now()}.pdf`;
    const fileKey = await this.fileService.uploadBuffer(
      Buffer.from(pdfBytes),
      fileName,
      'application/pdf',
      'private',
    );

    // Create certificate record
    const certificate = await this.prisma.certificate.create({
      data: {
        certificateTemplateId: templateId,
        applicantProcessId,
        certificateNumber,
        verificationCode,
        fileUrl: fileKey,
        fileSize: pdfBytes.length,
        issueDate,
        expiryDate,
        isExpired,
        generatedBy,
      },
    });

    return {
      certificateNumber,
      fileUrl: fileKey,
      fileSize: pdfBytes.length,
      verificationCode,
    };
  }

  /**
   * Render a field on the PDF
   */
  private async renderField(
    page: PDFPage,
    mapping: any,
    data: {
      name: string;
      certificateNumber: string;
      issueDate: Date;
      expiryDate: Date | null;
      verificationUrl: string;
      responsesByForm: Record<string, any>;
    },
    pageWidth: number,
    pageHeight: number,
  ): Promise<void> {
    const { width, height } = page.getSize();
    const fontSize = mapping.fontSize || 12;
    const fontFamily = mapping.fontFamily || 'Helvetica';
    const color = mapping.color ? this.parseColor(mapping.color) : rgb(0, 0, 0);
    const alignment = mapping.alignment || 'left';
    const pageDoc = page.doc;

    let text = '';
    let imageData: string | null = null;

    switch (mapping.fieldType) {
      case 'NAME':
        text = data.name;
        break;
      case 'CERT_NUMBER':
        text = data.certificateNumber;
        break;
      case 'ISSUE_DATE':
        text = format(data.issueDate, 'yyyy-MM-dd');
        break;
      case 'EXPIRY_DATE':
        text = data.expiryDate ? format(data.expiryDate, 'yyyy-MM-dd') : 'N/A';
        break;
      case 'QR_CODE':
        imageData = await this.generateQRCode(data.verificationUrl);
        break;
      case 'CUSTOM':
        if (mapping.sourceQuestionId) {
          // Use sourceFormId if specified, otherwise try all forms
          if (mapping.sourceFormId && data.responsesByForm[mapping.sourceFormId]) {
            text = this.extractQuestionValue(
              data.responsesByForm[mapping.sourceFormId],
              mapping.sourceQuestionId,
            ) || '';
          } else {
            // Try all forms
            for (const formId in data.responsesByForm) {
              text = this.extractQuestionValue(
                data.responsesByForm[formId],
                mapping.sourceQuestionId,
              ) || '';
              if (text) break;
            }
          }
        }
        break;
    }

    if (mapping.fieldType === 'QR_CODE' && imageData) {
      // Embed QR code image - imageData is base64 data URL
      const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
      const qrImage = await pageDoc.embedPng(Buffer.from(base64Data, 'base64'));
      // Use both width and height, ensuring square aspect ratio
      const qrSize = mapping.width && mapping.height 
        ? Math.min(mapping.width, mapping.height) 
        : (mapping.width || 100);
      // mapping.y is already in PDF bottom-left coordinates, no need to convert
      page.drawImage(qrImage, {
        x: mapping.x,
        y: mapping.y - qrSize, // Adjust for QR code height (bottom edge of QR code at mapping.y)
        width: qrSize,
        height: qrSize,
      });
    } else if (text) {
      // Render text - use standard fonts
      let font;
      try {
        if (fontFamily === 'Helvetica-Bold' || fontFamily === 'bold') {
          font = await pageDoc.embedFont(StandardFonts.HelveticaBold);
        } else if (fontFamily === 'Helvetica-Oblique' || fontFamily === 'italic') {
          font = await pageDoc.embedFont(StandardFonts.HelveticaOblique);
        } else {
          font = await pageDoc.embedFont(StandardFonts.Helvetica);
        }
      } catch {
        font = await pageDoc.embedFont(StandardFonts.Helvetica);
      }

      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const fieldWidth = mapping.width || textWidth;
      
      // Calculate x position based on alignment within field boundaries
      let x = mapping.x;
      if (alignment === 'center') {
        // Center text within the field width
        x = mapping.x + (fieldWidth / 2) - (textWidth / 2);
      } else if (alignment === 'right') {
        // Right align text within the field (right edge of text at right edge of field)
        x = mapping.x + fieldWidth - textWidth;
      }
      // For 'left' alignment, x = mapping.x (already set)

      // mapping.y is already in PDF bottom-left coordinates
      // Adjust for font size to position text baseline correctly
      page.drawText(text, {
        x,
        y: mapping.y - fontSize, // Text baseline position (adjust for font size)
        size: fontSize,
        font,
        color,
      });
    }
  }

  /**
   * Parse color string to RGB
   */
  private parseColor(colorString: string): RGB {
    // Support hex colors like #FF0000 or rgb(255, 0, 0)
    if (colorString.startsWith('#')) {
      const hex = colorString.substring(1);
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      return rgb(r, g, b);
    }

    // Default to black
    return rgb(0, 0, 0);
  }
}

