import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApplicantProcess, Prisma } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateApplicantProcessDto } from './dto/create-applicant-process.dto';
import { BulkCreateApplicantProcessDto } from './dto/bulk-create-applicant-process.dto';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ApplicantProcessService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private emailService: EmailService,
    private notificationService: NotificationService,
  ) {}

  async create(data: CreateApplicantProcessDto): Promise<ApplicantProcess> {
    const {
      applicantId,
      processId,
      formId,
      responses,
      nextStaffId,
      nextStepType,
      nextStepRoles,
      nextStepSpecifiedTo,
      notificationType,
      notificationToId,
      notificationToRoles,
      notificationComment
    } = data;

    const applicant = await this.prisma.user.findUnique({ where: { id: applicantId } });
    if (!applicant) {
        throw new NotFoundException('Applicant not found.');
    }

    const newApplicantProcess = await this.prisma.applicantProcess.create({
      data: {
        applicant: { connect: { id: applicantId } },
        process: { connect: { id: processId } },
      },
    });

    await this.prisma.formResponse.create({
      data: {
        form: { connect: { id: formId } },
        process: { connect: { id: processId } },
        applicantProcess: { connect: { id: newApplicantProcess.id } },
        responses,
      },
    });

    const processForm = await this.prisma.processForm.findFirst({
        where: { processId, formId }
    });

    if (!processForm) {
        throw new NotFoundException('Process form configuration not found.');
    }

    // Use provided fields or fallback to processForm defaults
    const completedFormData = {
      applicantProcessId: newApplicantProcess.id,
      formId: formId,
      reviewerId: applicantId, // The applicant is the first reviewer
      nextStaffId: nextStaffId || (processForm.nextStepType === 'STATIC' ? processForm.nextStaffId : undefined),
      nextStepType: nextStepType || processForm.nextStepType,
      nextStepRoles: nextStepRoles || processForm.nextStepRoles,
      nextStepSpecifiedTo: nextStepSpecifiedTo || processForm.nextStepSpecifiedTo,
      notificationType: notificationType || processForm.notificationType,
      notificationToId: notificationToId || processForm.notificationToId,
      notificationToRoles: notificationToRoles || processForm.notificationRoles,
      notificationComment: notificationComment || processForm.notificationComment,
    };

    await this.prisma.aPCompletedForm.create({
        data: completedFormData
    });

    // Send notifications asynchronously
    setImmediate(async () => {
      try {
        await this.notificationService.sendNotification(processForm, applicant, applicant);
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    });

    await this.auditLogService.log({
      userId: newApplicantProcess.applicantId,
      action: 'APPLICANT_PROCESS_CREATED',
      resource: 'ApplicantProcess',
      resourceId: newApplicantProcess.id,
      status: 'SUCCESS',
      details: { processId: newApplicantProcess.processId },
    });
    return newApplicantProcess;
  }

  async findAll(): Promise<ApplicantProcess[]> {
    return this.prisma.applicantProcess.findMany();
  }

  async findOne(id: string): Promise<ApplicantProcess | null> {
    return this.prisma.applicantProcess.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: Prisma.ApplicantProcessUpdateInput,
    userId?: string,
  ): Promise<ApplicantProcess> {
    const existingProcess = await this.prisma.applicantProcess.findUnique({
      where: { id },
      include: { applicant: true }
    });

    if (!existingProcess) {
      throw new NotFoundException('Applicant process not found');
    }

    // Check if status is being changed
    const statusChanged = data.status && existingProcess.status !== data.status;

    const updatedApplicantProcess = await this.prisma.applicantProcess.update({
      where: { id },
      data,
    });

    // Send email if status changed
    if (statusChanged && existingProcess.applicant) {
      setImmediate(async () => {
        try {
          const comment = (data as any).comment || `Your application status has been updated to ${data.status}`;
          await this.emailService.sendEmail(
            existingProcess.applicant.email,
            comment
          );
        } catch (error) {
          console.error('Failed to send status update email:', error);
        }
      });
    }

    await this.auditLogService.log({
      userId: userId || updatedApplicantProcess.applicantId,
      action: 'APPLICANT_PROCESS_UPDATED',
      resource: 'ApplicantProcess',
      resourceId: updatedApplicantProcess.id,
      status: 'SUCCESS',
      details: { changes: data },
    });
    return updatedApplicantProcess;
  }

  async remove(id: string): Promise<ApplicantProcess> {
    const deletedApplicantProcess = await this.prisma.applicantProcess.delete({
      where: { id },
    });
    await this.auditLogService.log({
      userId: deletedApplicantProcess.applicantId,
      action: 'APPLICANT_PROCESS_DELETED',
      resource: 'ApplicantProcess',
      resourceId: deletedApplicantProcess.id,
      status: 'SUCCESS',
      details: { processId: deletedApplicantProcess.processId },
    });
    return deletedApplicantProcess;
  }

  async findByUserId(userId: string): Promise<any[]> {
    // Get all applicant processes for the user
    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: { applicantId: userId },
      include: {
        process: true,
        completedForms: true,
        responses: {
          include: {
            form: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get all process forms to calculate levels
    const processIds = [...new Set(applicantProcesses.map(ap => ap.processId))];
    const processForms = await this.prisma.processForm.findMany({
      where: { processId: { in: processIds } },
      include: { form: true }
    });

    // Map the applications with all necessary data
    const applications = applicantProcesses.map((applicantProcess) => {
      const relatedProcessForms = processForms.filter(pf => pf.processId === applicantProcess.processId);
      const relatedCompletedForms = applicantProcess.completedForms;

      // Get first form ID from completed forms or process forms
      const firstFormId = relatedCompletedForms.length > 0
        ? relatedCompletedForms[0].formId
        : (relatedProcessForms.length > 0 ? relatedProcessForms[0].formId : null);

      const totalForms = relatedProcessForms.length;
      const completedFormsCount = relatedCompletedForms.length;
      const level = `${completedFormsCount}/${totalForms}`;

      return {
        id: applicantProcess.id,
        processId: applicantProcess.processId,
        processName: applicantProcess.process?.name || 'Unknown Process',
        status: applicantProcess.status,
        processStatus: completedFormsCount === totalForms && totalForms > 0
          ? 'Completed'
          : 'Submitted',
        level: applicantProcess.process?.applicantViewProcessLevel === true ? level : 'N/A',
        createdAt: applicantProcess.createdAt,
        firstFormId: firstFormId
      };
    });

    return applications;
  }

  async bulkCreate(
    data: BulkCreateApplicantProcessDto,
    file: Express.Multer.File,
    userId: string
  ): Promise<any> {
    const { processId, formId, nextStaffId } = data;

    if (!file) {
      throw new BadRequestException('Excel file is required');
    }

    // Validate required fields
    if (!processId || !formId) {
      throw new BadRequestException('processId and formId are required');
    }

    // Get form design to understand question structure
    const form = await this.prisma.form.findUnique({
      where: { id: formId }
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    const formDesign = form.design as any;
    if (!formDesign?.sections) {
      throw new BadRequestException('Form design not found or invalid');
    }

    // Parse Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new BadRequestException('Excel file must contain at least one worksheet');
    }

    const jsonData: any[][] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header
        const rowData: any[] = [];
        row.eachCell((cell) => {
          rowData.push(cell.value);
        });
        jsonData.push(rowData);
      }
    });

    if (jsonData.length === 0) {
      throw new BadRequestException('Excel file must contain at least a header row and one data row');
    }

    // Get headers
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(cell.value?.toString() || '');
    });

    // Validate and process each row
    const errors: Array<{ row: number; column: string; error: string; suggestion?: string }> = [];
    const validSubmissions: any[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // Excel row number (1-based, plus header)

      try {
        const submissionData = await this.validateAndParseRow(headers, row, formDesign.sections, rowNumber);
        if (submissionData.errors.length > 0) {
          errors.push(...submissionData.errors);
        } else {
          validSubmissions.push({
            rowNumber,
            responses: submissionData.responses
          });
        }
      } catch (error) {
        errors.push({
          row: rowNumber,
          column: 'General',
          error: error instanceof Error ? error.message : 'Unknown error',
          suggestion: 'Check the row data format'
        });
      }
    }

    // If there are any errors, return them and don't process any submissions
    if (errors.length > 0) {
      return {
        success: false,
        message: 'Validation errors found in Excel file',
        errors,
        totalRows: jsonData.length,
        validRows: validSubmissions.length,
        errorRows: errors.length
      };
    }

    // Process valid submissions
    const results: Array<{ rowNumber: number; success: boolean; applicantProcessId?: string; error?: string }> = [];
    for (const submission of validSubmissions) {
      try {
        const result = await this.createSingleApplicantProcess({
          applicantId: userId,
          processId,
          formId,
          nextStaffId,
          responses: submission.responses
        });
        results.push({
          rowNumber: submission.rowNumber,
          success: true,
          applicantProcessId: result.applicantProcessId
        });
      } catch (error) {
        results.push({
          rowNumber: submission.rowNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      success: true,
      message: `Bulk submission completed. ${successful.length} successful, ${failed.length} failed.`,
      results: {
        total: validSubmissions.length,
        successful: successful.length,
        failed: failed.length,
        details: results
      }
    };
  }

  private async validateAndParseRow(
    headers: string[],
    row: any[],
    sections: any[],
    rowNumber: number
  ): Promise<{ responses: any[]; errors: Array<{ row: number; column: string; error: string; suggestion?: string }> }> {
    const errors: Array<{ row: number; column: string; error: string; suggestion?: string }> = [];
    const responses: any[] = [];

    // Create a map of column names to their indices (case-insensitive)
    const columnMap = new Map<string, number>();
    headers.forEach((header, index) => {
      if (header) {
        columnMap.set(header.toLowerCase().trim(), index);
      }
    });

    // Process each section
    for (const section of sections) {
      const sectionResponses: any[] = [];

      for (const question of section.questions) {
        const questionLabel = question.label || question.titleName || question.descriptionName || '';

        // Find matching column (flexible matching)
        let columnIndex = -1;
        let matchedColumn = '';

        for (const [colName, index] of columnMap.entries()) {
          if (colName.includes(questionLabel.toLowerCase()) ||
              questionLabel.toLowerCase().includes(colName) ||
              colName.includes(question.id.toLowerCase())) {
            columnIndex = index;
            matchedColumn = headers[index];
            break;
          }
        }

        const cellValue = columnIndex >= 0 ? row[columnIndex] : null;

        // Validate based on question type
        try {
          const parsedValue = await this.validateQuestionValue(question, cellValue, matchedColumn);
          sectionResponses.push({
            questionId: question.id,
            questionType: question.type,
            label: questionLabel,
            response: parsedValue
          });
        } catch (error) {
          errors.push({
            row: rowNumber,
            column: matchedColumn || questionLabel,
            error: error instanceof Error ? error.message : 'Validation error',
            suggestion: this.getSuggestionForQuestionType(question.type)
          });
        }
      }

      if (sectionResponses.length > 0) {
        responses.push({
          sectionId: section.id,
          sectionName: section.name || `Section ${sections.indexOf(section) + 1}`,
          responses: sectionResponses
        });
      }
    }

    return { responses, errors };
  }

  private async validateQuestionValue(question: any, value: any, columnName: string): Promise<any> {
    if (value === null || value === undefined || value === '') {
      if (question.required === 'yes') {
        throw new Error(`Required field is empty`);
      }
      return null;
    }

    const stringValue = String(value).trim();

    switch (question.type) {
      case 'Short Text':
      case 'Paragraph':
        if (question.minCharacters && stringValue.length < question.minCharacters) {
          throw new Error(`Text too short. Minimum ${question.minCharacters} characters required`);
        }
        if (question.maxCharacters && stringValue.length > question.maxCharacters) {
          throw new Error(`Text too long. Maximum ${question.maxCharacters} characters allowed`);
        }
        return stringValue;

      case 'Email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(stringValue)) {
          throw new Error(`Invalid email format`);
        }
        return stringValue;

      case 'Phone Number':
        if (stringValue.length < 10) {
          throw new Error(`Phone number too short`);
        }
        return stringValue;

      case 'Number':
        const numValue = parseFloat(stringValue);
        if (isNaN(numValue)) {
          throw new Error(`Invalid number format`);
        }
        if (question.decimalOptions === 'no-decimals' && numValue % 1 !== 0) {
          throw new Error(`Decimal not allowed for this field`);
        }
        return numValue;

      case 'Date':
        const dateValue = new Date(stringValue);
        if (isNaN(dateValue.getTime())) {
          throw new Error(`Invalid date format. Use MM/DD/YYYY or DD-MM-YYYY`);
        }
        return dateValue.toISOString().split('T')[0];

      case 'DateTime':
        const dateTimeValue = new Date(stringValue);
        if (isNaN(dateTimeValue.getTime())) {
          throw new Error(`Invalid date/time format`);
        }
        return dateTimeValue.toISOString();

      case 'Time':
        return stringValue;

      case 'Date Range':
        try {
          const [startDate, endDate] = stringValue.split('-').map((d: string) => d.trim());
          const start = new Date(startDate);
          const end = new Date(endDate);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error(`Invalid date range format`);
          }
          return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
        } catch {
          throw new Error(`Invalid date range format. Use 'MM/DD/YYYY - MM/DD/YYYY'`);
        }

      case 'Dropdown':
        if (question.options && Array.isArray(question.options)) {
          const normalizedValue = stringValue.toLowerCase();
          const match = question.options.find((opt: string) =>
            opt.toLowerCase() === normalizedValue
          );
          if (!match) {
            throw new Error(`Invalid option. Available options: ${question.options.join(', ')}`);
          }
          return match;
        }
        return stringValue;

      case 'Checkbox':
        if (question.options && Array.isArray(question.options)) {
          const selectedOptions = stringValue.split(',').map((opt: string) => opt.trim());
          const invalidOptions = selectedOptions.filter(opt =>
            !question.options.some((availableOpt: string) =>
              availableOpt.toLowerCase() === opt.toLowerCase()
            )
          );
          if (invalidOptions.length > 0) {
            throw new Error(`Invalid options: ${invalidOptions.join(', ')}. Available: ${question.options.join(', ')}`);
          }
          return selectedOptions;
        }
        return stringValue;

      case 'Upload':
        if (!stringValue.startsWith('http') && !stringValue.includes('/')) {
          throw new Error(`Invalid file URL or path`);
        }
        return stringValue;

      case 'Countries':
        // Basic validation - can be enhanced with country list
        return stringValue;

      case 'From Database':
      case 'Add To Database':
        // Would need database lookup - for now accept as string
        return stringValue;

      default:
        return stringValue;
    }
  }

  private getSuggestionForQuestionType(questionType: string): string {
    switch (questionType) {
      case 'Email':
        return 'Enter a valid email address (e.g., user@example.com)';
      case 'Phone Number':
        return 'Enter a valid phone number with at least 10 digits';
      case 'Number':
        return 'Enter a valid number (decimals allowed unless specified)';
      case 'Date':
        return 'Use format: MM/DD/YYYY or DD-MM-YYYY';
      case 'DateTime':
        return 'Use format: MM/DD/YYYY HH:MM or DD-MM-YYYY HH:MM';
      case 'Date Range':
        return 'Use format: MM/DD/YYYY - MM/DD/YYYY';
      case 'Dropdown':
        return 'Select from available options';
      case 'Checkbox':
        return 'Enter multiple options separated by commas';
      case 'Upload':
        return 'Enter a valid file URL or path';
      default:
        return 'Enter appropriate value for this field type';
    }
  }

  private async createSingleApplicantProcess(data: {
    applicantId: string;
    processId: string;
    formId: string;
    nextStaffId?: string;
    responses: any[];
  }) {
    const { applicantId, processId, formId, nextStaffId, responses } = data;

    // Create new applicant process
    const newApplicantProcess = await this.prisma.applicantProcess.create({
      data: {
        applicant: { connect: { id: applicantId } },
        process: { connect: { id: processId } },
      },
    });

    // Fetch process form details
    const processForm = await this.prisma.processForm.findFirst({
      where: { processId, formId }
    });

    if (!processForm) {
      throw new Error('Process form not found');
    }

    const completedForms = await this.prisma.aPCompletedForm.create({
      data: {
        applicantProcessId: newApplicantProcess.id,
        formId: formId,
        reviewerId: applicantId,
        nextStaffId: processForm.nextStepType === 'STATIC' ? processForm.nextStaffId : nextStaffId,
        nextStepType: processForm.nextStepType,
        nextStepRoles: processForm.nextStepRoles,
        nextStepSpecifiedTo: processForm.nextStepSpecifiedTo,
        notificationType: processForm.notificationType,
        notificationToId: processForm.notificationToId,
        notificationToRoles: processForm.notificationRoles,
        notificationComment: processForm.notificationComment,
      }
    });

    // Save form responses
    const submitResponse = await this.prisma.formResponse.create({
      data: {
        form: { connect: { id: formId } },
        process: { connect: { id: processId } },
        applicantProcess: { connect: { id: newApplicantProcess.id } },
        responses,
      },
    });

    return {
      applicantProcessId: newApplicantProcess.id,
      completedFormId: completedForms.id,
      responseId: submitResponse.id
    };
  }
}
