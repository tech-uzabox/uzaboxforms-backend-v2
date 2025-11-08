import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicantProcess, Prisma } from 'db/client';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { EmailService } from '../email/email.service';
import { ExportService } from '../export/export.service';
import { ExportColumn } from '../export/interfaces/export.interface';
import { NotificationService } from '../notification/notification.service';
import { WidgetService } from '../widget/widget.service';
import { BulkCreateApplicantProcessDto } from './dto/bulk-create-applicant-process.dto';
import { CreateApplicantProcessDto } from './dto/create-applicant-process.dto';
import { DownloadApplicantProcessDto } from './dto/download-applicant-process.dto';
import {
  formatDateForStorage,
  parseStoredDate,
  isValidTimezone,
  formatInTimezone
} from '../utils/timezone';
import * as fs from 'fs';
import * as path from 'path';

function excelSerialToJSDate(serial: number): Date {
  const millisecondsPerDay = 86400 * 1000;
  const utcDays = serial - 25569;
  const utcValue = utcDays * millisecondsPerDay;
  const dateInfo = new Date(utcValue);

  return new Date(
    dateInfo.getUTCFullYear(),
    dateInfo.getUTCMonth(),
    dateInfo.getUTCDate(),
    dateInfo.getUTCHours(),
    dateInfo.getUTCMinutes(),
    dateInfo.getUTCSeconds(),
  );
}

@Injectable()
export class ApplicantProcessService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private exportService: ExportService,
    private widgetService: WidgetService,
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
      notificationComment,
    } = data;

    const applicant = await this.prisma.user.findUnique({
      where: { id: applicantId },
    });
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
      where: { processId, formId },
    });

    if (!processForm) {
      throw new NotFoundException('Process form configuration not found.');
    }

    const completedFormData = {
      applicantProcessId: newApplicantProcess.id,
      formId: formId,
      reviewerId: applicantId,
      nextStaffId:
        nextStaffId ||
        (processForm.nextStepType === 'STATIC'
          ? processForm.nextStaffId
          : undefined),
      nextStepType: nextStepType || processForm.nextStepType,
      nextStepRoles: nextStepRoles || processForm.nextStepRoles,
      nextStepSpecifiedTo:
        nextStepSpecifiedTo || processForm.nextStepSpecifiedTo,
      notificationType: notificationType || processForm.notificationType,
      notificationToId: notificationToId || processForm.notificationToId,
      notificationToRoles: notificationToRoles || processForm.notificationRoles,
      notificationComment:
        notificationComment || processForm.notificationComment,
    };

    await this.prisma.aPCompletedForm.create({
      data: completedFormData,
    });

    setImmediate(async () => {
      try {
        await this.notificationService.sendNotification(
          processForm,
          applicant,
          applicant,
        );
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

    // Invalidate widget caches for the affected form
    setImmediate(async () => {
      try {
        const affectedWidgets = await this.widgetService.findWidgetsByFormIds([formId]);
        if (affectedWidgets.length > 0) {
          const widgetIds = affectedWidgets.map(w => w.id);
          await this.widgetService.invalidateWidgetCaches(widgetIds);
        }
      } catch (error) {
        console.error('Failed to invalidate widget caches after create:', error);
      }
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
      include: { applicant: true },
    });

    if (!existingProcess) {
      throw new NotFoundException('Applicant process not found');
    }

    const statusChanged = data.status && existingProcess.status !== data.status;

    const updatedApplicantProcess = await this.prisma.applicantProcess.update({
      where: { id },
      data,
    });

    if (statusChanged && existingProcess.applicant) {
      setImmediate(async () => {
        try {
          const comment =
            (data as any).comment ||
            `Your application status has been updated to ${data.status}`;
          await this.emailService.sendEmail(
            existingProcess.applicant.email,
            comment,
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

    // Invalidate widget caches for forms associated with this process
    setImmediate(async () => {
      try {
        const formResponses = await this.prisma.formResponse.findMany({
          where: { applicantProcessId: id },
          select: { formId: true },
        });
        const formIds = [...new Set(formResponses.map(fr => fr.formId))];
        if (formIds.length > 0) {
          const affectedWidgets = await this.widgetService.findWidgetsByFormIds(formIds);
          if (affectedWidgets.length > 0) {
            const widgetIds = affectedWidgets.map(w => w.id);
            await this.widgetService.invalidateWidgetCaches(widgetIds);
          }
        }
      } catch (error) {
        console.error('Failed to invalidate widget caches after update:', error);
      }
    });

    return updatedApplicantProcess;
  }

  async remove(id: string): Promise<ApplicantProcess> {
    // Get form IDs before deletion for cache invalidation
    const formResponses = await this.prisma.formResponse.findMany({
      where: { applicantProcessId: id },
      select: { formId: true },
    });
    const formIds = [...new Set(formResponses.map(fr => fr.formId))];

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

    // Invalidate widget caches for forms associated with this process
    setImmediate(async () => {
      try {
        if (formIds.length > 0) {
          const affectedWidgets = await this.widgetService.findWidgetsByFormIds(formIds);
          if (affectedWidgets.length > 0) {
            const widgetIds = affectedWidgets.map(w => w.id);
            await this.widgetService.invalidateWidgetCaches(widgetIds);
          }
        }
      } catch (error) {
        console.error('Failed to invalidate widget caches after delete:', error);
      }
    });

    return deletedApplicantProcess;
  }

  async findByUserId(userId: string): Promise<any[]> {
    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: { applicantId: userId },
      include: {
        process: true,
        completedForms: true,
        responses: {
          include: {
            form: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const processIds = [
      ...new Set(applicantProcesses.map((ap) => ap.processId)),
    ];
    const processForms = await this.prisma.processForm.findMany({
      where: { processId: { in: processIds } },
      include: { form: true },
    });

    const applications = applicantProcesses.map((applicantProcess) => {
      const relatedProcessForms = processForms.filter(
        (pf) => pf.processId === applicantProcess.processId,
      );
      const relatedCompletedForms = applicantProcess.completedForms;

      const firstFormId =
        relatedCompletedForms.length > 0
          ? relatedCompletedForms[0].formId
          : relatedProcessForms.length > 0
            ? relatedProcessForms[0].formId
            : null;

      const totalForms = relatedProcessForms.length;
      const completedFormsCount = relatedCompletedForms.length;
      const level = `${completedFormsCount}/${totalForms}`;

      return {
        id: applicantProcess.id,
        processId: applicantProcess.processId,
        processName: applicantProcess.process?.name || 'Unknown Process',
        status: applicantProcess.status,
        processStatus:
          completedFormsCount === totalForms && totalForms > 0
            ? 'Completed'
            : 'Submitted',
        level:
          applicantProcess.process?.applicantViewProcessLevel === true
            ? level
            : 'N/A',
        createdAt: applicantProcess.createdAt,
        firstFormId: firstFormId,
      };
    });

    return applications;
  }

  async bulkCreate(
    data: BulkCreateApplicantProcessDto,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<any> {
    const { processId, formId, nextStaffId } = data;

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one Excel file is required');
    }

    if (!processId || !formId) {
      throw new BadRequestException('processId and formId are required');
    }

    const form = await this.prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    const formDesign = form.design as any;
    if (!formDesign) {
      throw new BadRequestException('Form design not found or invalid');
    }

    const allResults: any[] = [];
    const allErrors: Array<{
      file: string;
      row: number;
      column: string;
      error: string;
      suggestion?: string;
    }> = [];

    for (const file of files) {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fs.readFileSync(file.path) as any);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
          allErrors.push({
            file: file.originalname,
            row: 0,
            column: 'General',
            error: 'Excel file must contain at least one worksheet',
          });
          continue;
        }

        const jsonData: any[][] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            const rowData: any[] = [];
            row.eachCell((cell) => {
              rowData.push(cell.value);
            });
            jsonData.push(rowData);
          }
        });

        if (jsonData.length === 0) {
          allErrors.push({
            file: file.originalname,
            row: 0,
            column: 'General',
            error: 'Excel file must contain at least a header row and one data row',
          });
          continue;
        }

        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell) => {
          headers.push(cell.value?.toString() || '');
        });

        // Validate that headers are not empty and contain question labels
        const emptyHeaders = headers.filter(header => !header || header.trim() === '');
        if (emptyHeaders.length > 0) {
          allErrors.push({
            file: file.originalname,
            row: 0,
            column: 'Headers',
            error: 'Excel file headers (first row) cannot be empty. Please ensure all column headers contain question labels.',
          });
          continue;
        }

        const fileErrors: Array<{
          file: string;
          row: number;
          column: string;
          error: string;
          suggestion?: string;
        }> = [];
        const validSubmissions: any[] = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowNumber = i + 2;

          try {
            const submissionData = await this.validateAndParseRow(
              headers,
              row,
              formDesign,
              rowNumber,
            );
            if (submissionData.errors.length > 0) {
              fileErrors.push(...submissionData.errors.map(err => ({
                ...err,
                file: file.originalname,
              } as any)));
            } else {
              validSubmissions.push({
                rowNumber,
                responses: submissionData.responses,
              });
            }
          } catch (error) {
            fileErrors.push({
              row: rowNumber,
              column: 'General',
              error: error instanceof Error ? error.message : 'Unknown error',
              suggestion: 'Check the row data format',
              file: file.originalname,
            });
          }
        }

        allErrors.push(...fileErrors);

        if (fileErrors.length === 0) {
          const results: Array<{
            rowNumber: number;
            success: boolean;
            applicantProcessId?: string;
            error?: string;
          }> = [];
          for (const submission of validSubmissions) {
            try {
              const result = await this.createSingleApplicantProcess({
                applicantId: userId,
                processId,
                formId,
                nextStaffId,
                responses: submission.responses,
              });
              results.push({
                rowNumber: submission.rowNumber,
                success: true,
                applicantProcessId: result.applicantProcessId,
              });
            } catch (error) {
              results.push({
                rowNumber: submission.rowNumber,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }

          allResults.push({
            file: file.originalname,
            results,
          });
        }
      } catch (error) {
        allErrors.push({
          file: file.originalname,
          row: 0,
          column: 'General',
          error: error instanceof Error ? error.message : 'Failed to process file',
        });
      } finally {
        // Clean up the uploaded file
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.error('Failed to cleanup file:', file.path, cleanupError);
        }
      }
    }

    // Clean up the uploads/temp directory if empty
    try {
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      const filesInTemp = fs.readdirSync(tempDir);
      if (filesInTemp.length === 0) {
        fs.rmdirSync(tempDir);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup temp directory:', cleanupError);
    }

    if (allErrors.length > 0) {
      return {
        success: false,
        message: 'Validation errors found in Excel files',
        errors: allErrors,
        totalFiles: files.length,
        processedFiles: allResults.length,
        errorFiles: allErrors.length,
      };
    }

    const totalSuccessful = allResults.reduce((sum, fileResult) =>
      sum + fileResult.results.filter(r => r.success).length, 0);
    const totalFailed = allResults.reduce((sum, fileResult) =>
      sum + fileResult.results.filter(r => !r.success).length, 0);

    // Invalidate widget caches for the affected form
    setImmediate(async () => {
      try {
        const affectedWidgets = await this.widgetService.findWidgetsByFormIds([formId]);
        if (affectedWidgets.length > 0) {
          const widgetIds = affectedWidgets.map(w => w.id);
          await this.widgetService.invalidateWidgetCaches(widgetIds);
        }
      } catch (error) {
        console.error('Failed to invalidate widget caches after bulkCreate:', error);
      }
    });

    return {
      success: true,
      message: `Bulk submission completed. ${totalSuccessful} successful, ${totalFailed} failed across ${allResults.length} files.`,
      results: {
        totalFiles: files.length,
        processedFiles: allResults.length,
        totalSubmissions: totalSuccessful + totalFailed,
        successful: totalSuccessful,
        failed: totalFailed,
        fileDetails: allResults,
      },
    };
  }

  private async validateAndParseRow(
    headers: string[],
    row: any[],
    sections: any[],
    rowNumber: number,
  ): Promise<{
    responses: any[];
    errors: Array<{
      row: number;
      column: string;
      error: string;
      suggestion?: string;
    }>;
  }> {
    const errors: Array<{
      row: number;
      column: string;
      error: string;
      suggestion?: string;
    }> = [];
    const responses: any[] = [];

    const columnMap = new Map<string, number>();
    headers.forEach((header, index) => {
      if (header) {
        columnMap.set(header.toLowerCase().trim(), index);
      }
    });

    for (const section of sections) {
      const sectionResponses: any[] = [];

      for (const question of section.questions) {
        const questionLabel =
          question.label ||
          question.titleName ||
          question.descriptionName ||
          '';

        let columnIndex = -1;
        let matchedColumn = '';

        for (const [colName, index] of columnMap.entries()) {
          if (
            colName?.includes(questionLabel?.toLowerCase()) ||
            questionLabel?.toLowerCase()?.includes(colName) ||
            colName?.includes(question?.id?.toLowerCase())
          ) {
            columnIndex = index;
            matchedColumn = headers[index];
            break;
          }
        }

        const cellValue = columnIndex >= 0 ? row[columnIndex] : null;

        try {
          const parsedValue = await this.validateQuestionValue(
            question,
            cellValue,
            matchedColumn,
          );
          sectionResponses.push({
            questionId: question.id,
            questionType: question.type,
            label: questionLabel,
            response: parsedValue,
          });
        } catch (error) {
          errors.push({
            row: rowNumber,
            column: matchedColumn || questionLabel,
            error: error instanceof Error ? error.message : 'Validation error',
            suggestion: this.getSuggestionForQuestionType(question.type),
          });
        }
      }

      if (sectionResponses.length > 0) {
        responses.push({
          sectionId: section.id,
          sectionName:
            section.name || `Section ${sections.indexOf(section) + 1}`,
          responses: sectionResponses,
        });
      }
    }

    return { responses, errors };
  }

  private async validateQuestionValue(
    question: any,
    value: any,
    columnName: string,
  ): Promise<any> {
    if (value === null || value === undefined || value === '') {
      if (question.required === 'yes') {
        throw new Error(`Required field "${columnName}" is empty`);
      }
      return null;
    }
    console.log('value', value);

    const stringValue =
      typeof value === 'object' && value !== null && 'text' in value
        ? String(value.text).trim()
        : String(value).trim();

    switch (question.type) {
      case 'Short Text':
      case 'Paragraph':
        if (
          question.minCharacters &&
          stringValue.length < question.minCharacters
        ) {
          throw new Error(
            `Text too short. Minimum ${question.minCharacters} characters required`,
          );
        }
        if (
          question.maxCharacters &&
          stringValue.length > question.maxCharacters
        ) {
          throw new Error(
            `Text too long. Maximum ${question.maxCharacters} characters allowed`,
          );
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
        let dateOnlyValue: Date | null = null;

        if (typeof value === 'number') {
          dateOnlyValue = excelSerialToJSDate(value);
        } else {
          const stringValue = String(value).trim();
          dateOnlyValue = new Date(stringValue);
          if (isNaN(dateOnlyValue.getTime())) {
            throw new Error(
              `Invalid date format. Use MM/DD/YYYY or DD-MM-YYYY`,
            );
          }
        }

        // Handle timezone if specified in question
        const timezone = question?.timezone;
        if (timezone && isValidTimezone(timezone)) {
          return formatDateForStorage(dateOnlyValue, timezone).split('T')[0];
        }

        return dateOnlyValue.toISOString().split('T')[0];

      case 'DateTime':
        let dateTimeValue: Date | null = null;

        if (typeof value === 'number') {
          dateTimeValue = excelSerialToJSDate(value);
        } else {
          const stringValue = String(value).trim();
          dateTimeValue = new Date(stringValue);
          if (isNaN(dateTimeValue.getTime())) {
            throw new Error(`Invalid date/time format. Use MM/DD/YYYY HH:mm`);
          }
        }

        // Handle timezone if specified in question
        const dateTimeTimezone = question?.timezone;
        if (dateTimeTimezone && isValidTimezone(dateTimeTimezone)) {
          return formatDateForStorage(dateTimeValue, dateTimeTimezone);
        }

        return dateTimeValue.toISOString();

      case 'Time':
        return stringValue;

      case 'Date Range':
        try {
          const [startDate, endDate] = stringValue
            .split('-')
            .map((d: string) => d.trim());
          const start = new Date(startDate);
          const end = new Date(endDate);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error(`Invalid date range format`);
          }

          // Handle timezone if specified in question
          const dateRangeTimezone = question?.timezone;
          if (dateRangeTimezone && isValidTimezone(dateRangeTimezone)) {
            return {
              startDate: formatDateForStorage(start, dateRangeTimezone).split('T')[0],
              endDate: formatDateForStorage(end, dateRangeTimezone).split('T')[0],
            };
          }

          return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
          };
        } catch {
          throw new Error(
            `Invalid date range format. Use 'MM/DD/YYYY - MM/DD/YYYY'`,
          );
        }

      case 'Dropdown':
        if (question.options && Array.isArray(question.options)) {
          const normalizedValue = stringValue.toLowerCase();
          const match = question.options.find(
            (opt: string) => opt.toLowerCase() === normalizedValue,
          );
          if (!match) {
            throw new Error(
              `Invalid option. Available options: ${question.options.join(', ')}`,
            );
          }
          return match;
        }
        return stringValue;

      case 'Checkbox':
        if (question.options && Array.isArray(question.options)) {
          const selectedOptions = stringValue
            .split(',')
            .map((opt: string) => opt.trim());
          const invalidOptions = selectedOptions.filter(
            (opt) =>
              !question.options.some(
                (availableOpt: string) =>
                  availableOpt.toLowerCase() === opt.toLowerCase(),
              ),
          );
          if (invalidOptions.length > 0) {
            throw new Error(
              `Invalid options: ${invalidOptions.join(', ')}. Available: ${question.options.join(', ')}`,
            );
          }
          const response = question.options.map((option: string) => ({
            url: '',
            option,
            checked: selectedOptions.some(
              (sel) => sel.toLowerCase() === option.toLowerCase(),
            ),
          }));
          return response;
        }
        return stringValue;

      case 'Upload':
        if (!stringValue.startsWith('http') && !stringValue.includes('/')) {
          throw new Error(`Invalid file URL or path`);
        }
        return stringValue;

      case 'Countries':
        return stringValue;

      case 'From Database':
      case 'Add To Database':
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

    const newApplicantProcess = await this.prisma.applicantProcess.create({
      data: {
        applicant: { connect: { id: applicantId } },
        process: { connect: { id: processId } },
      },
    });

    const processForm = await this.prisma.processForm.findFirst({
      where: { processId, formId },
    });

    if (!processForm) {
      throw new Error('Process form not found');
    }

    const completedForms = await this.prisma.aPCompletedForm.create({
      data: {
        applicantProcessId: newApplicantProcess.id,
        formId: formId,
        reviewerId: applicantId,
        nextStaffId:
          processForm.nextStepType === 'STATIC'
            ? processForm.nextStaffId
            : nextStaffId,
        nextStepType: processForm.nextStepType,
        nextStepRoles: processForm.nextStepRoles,
        nextStepSpecifiedTo: processForm.nextStepSpecifiedTo,
        notificationType: processForm.notificationType,
        notificationToId: processForm.notificationToId,
        notificationToRoles: processForm.notificationRoles,
        notificationComment: processForm.notificationComment,
      },
    });

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
      responseId: submitResponse.id,
    };
  }

  async downloadApplicantProcessData(
    data: DownloadApplicantProcessDto,
    res: Response,
    userId: string,
  ): Promise<void> {
    const { processId, formId } = data;

    console.log(
      'Starting download for processId:',
      processId,
      'formId:',
      formId,
    );

    const form = await this.prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }


    const formDesign = form.design as any;
    if (!formDesign) {
      throw new BadRequestException('Form design not found or invalid');
    }


    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: { processId },
      include: {
        applicant: true,
        responses: {
          where: { formId },
        },
      },
    });


    const columns: ExportColumn[] = [];
    const questionMap = new Map<string, any>();

    if (
      formDesign.sections &&
      Array.isArray(formDesign.sections) &&
      formDesign.sections.length > 0
    ) {
      for (const section of formDesign.sections) {
        if (section.questions && Array.isArray(section.questions)) {
          for (const question of section.questions) {
            const questionLabel =
              question.label ||
              question.titleName ||
              question.descriptionName ||
              question.id ||
              '';

            questionMap.set(question.id, question);
            columns.push({
              header: questionLabel,
              key: question.id,
              type: this.getColumnTypeForQuestionType(question.type),
            });
          }
        }
      }
    } else {

      const allQuestionIds = new Set<string>();

      for (const applicantProcess of applicantProcesses) {
        for (const response of applicantProcess.responses) {
          const responseData = response.responses as any;
          if (!responseData) continue;

          if (Array.isArray(responseData)) {
            for (const section of responseData) {
              if (section.responses && Array.isArray(section.responses)) {
                for (const sectionResponse of section.responses) {
                  allQuestionIds.add(sectionResponse.questionId);
                }
              }
            }
          } else if (typeof responseData === 'object' && responseData !== null) {
            for (const [sectionKey, sectionData] of Object.entries(
              responseData,
            )) {
              if (
                sectionData &&
                typeof sectionData === 'object' &&
                sectionData !== null &&
                !Array.isArray(sectionData)
              ) {
                const section = sectionData as any;
                
                // Check if it has 'questions' property (form submission format)
                if ('questions' in section && section.questions) {
                  const questions = section.questions;
                  
                  // Handle both object and array formats for questions
                  if (typeof questions === 'object' && !Array.isArray(questions)) {
                    // Object format: { questionId: { questionId, questionType, label, response } }
                    for (const questionId of Object.keys(questions)) {
                      allQuestionIds.add(questionId);
                    }
                  } else if (Array.isArray(questions)) {
                    // Array format: [{ questionId, questionType, label, response }, ...]
                    for (const questionResponse of questions) {
                      if (questionResponse && typeof questionResponse === 'object' && 'questionId' in questionResponse) {
                        allQuestionIds.add(questionResponse.questionId);
                      }
                    }
                  }
                } else if ('responses' in section && Array.isArray(section.responses)) {
                  // Fallback: Handle nested responses array format
                  for (const sectionResponse of section.responses) {
                    if (sectionResponse && typeof sectionResponse === 'object' && 'questionId' in sectionResponse) {
                      allQuestionIds.add(sectionResponse.questionId);
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Found question IDs from responses

      for (const questionId of allQuestionIds) {
        let questionLabel = questionId;
        let questionType = 'Short Text';

        if (formDesign && typeof formDesign === 'object') {
          for (const [key, value] of Object.entries(formDesign)) {
            if (
              key.startsWith('section') &&
              value &&
              typeof value === 'object' &&
              'questions' in value
            ) {
              const section = value as any;
              if (
                section.questions &&
                typeof section.questions === 'object' &&
                questionId in section.questions
              ) {
                const q = section.questions[questionId] as any;
                questionLabel =
                  q.label || q.titleName || q.descriptionName || questionId;
                questionType = q.type || questionType;
                break;
              }
            }
          }
        }

        if (questionLabel === questionId) {
          for (const applicantProcess of applicantProcesses) {
            for (const response of applicantProcess.responses) {
              const responseData = response.responses as any;
              if (!responseData) continue;

              if (Array.isArray(responseData)) {
                for (const section of responseData) {
                  if (section.responses && Array.isArray(section.responses)) {
                    for (const sectionResponse of section.responses) {
                      if (
                        sectionResponse.questionId === questionId &&
                        sectionResponse.label
                      ) {
                        questionLabel = sectionResponse.label;
                        break;
                      }
                    }
                  }
                }
              } else if (typeof responseData === 'object' && responseData !== null) {
                for (const [sectionKey, sectionData] of Object.entries(
                  responseData,
                )) {
                  if (
                    sectionData &&
                    typeof sectionData === 'object' &&
                    sectionData !== null &&
                    !Array.isArray(sectionData)
                  ) {
                    const section = sectionData as any;
                    
                    // Check if it has 'questions' property (form submission format)
                    if ('questions' in section && section.questions) {
                      const questions = section.questions;
                      
                      // Handle both object and array formats for questions
                      if (typeof questions === 'object' && !Array.isArray(questions)) {
                        // Object format: { questionId: { questionId, questionType, label, response } }
                        if (questionId in questions) {
                          const qResp = questions[questionId] as any;
                          if (qResp && typeof qResp === 'object' && qResp.label) {
                            questionLabel = qResp.label;
                            break;
                          }
                        }
                      } else if (Array.isArray(questions)) {
                        // Array format: [{ questionId, questionType, label, response }, ...]
                        for (const questionResponse of questions) {
                          if (questionResponse && typeof questionResponse === 'object' && 
                              'questionId' in questionResponse && 
                              questionResponse.questionId === questionId &&
                              questionResponse.label) {
                            questionLabel = questionResponse.label;
                            break;
                          }
                        }
                        if (questionLabel !== questionId) break;
                      }
                    } else if ('responses' in section && Array.isArray(section.responses)) {
                      // Fallback: Handle nested responses array format
                      for (const sectionResponse of section.responses) {
                        if (sectionResponse && typeof sectionResponse === 'object' && 
                            'questionId' in sectionResponse &&
                            sectionResponse.questionId === questionId &&
                            sectionResponse.label) {
                          questionLabel = sectionResponse.label;
                          break;
                        }
                      }
                      if (questionLabel !== questionId) break;
                    }
                  }
                }
              }
              if (questionLabel !== questionId) break;
            }
            if (questionLabel !== questionId) break;
          }
        }


        questionMap.set(questionId, { type: questionType });
        columns.push({
          header: questionLabel,
          key: questionId,
          type: this.getColumnTypeForQuestionType(questionType),
        });
      }
    }


    const rows: Record<string, any>[] = [];

    for (const applicantProcess of applicantProcesses) {
      const row: Record<string, any> = {};

      for (const response of applicantProcess.responses) {
        const responseData = response.responses as any;

        if (!responseData) {
          continue;
        }

        if (Array.isArray(responseData)) {
          // Handle Excel upload format: [{ sectionId, sectionName, responses: [...] }]
          for (const section of responseData) {
            if (section.responses && Array.isArray(section.responses)) {
              for (const sectionResponse of section.responses) {
                const questionId = sectionResponse.questionId;
                let value = sectionResponse.response;

                const question = questionMap.get(questionId);
                const formattedValue = this.formatResponseValue(
                  value,
                  sectionResponse.questionType || question?.type,
                );

                row[questionId] = formattedValue;
              }
            }
          }
        } else if (typeof responseData === 'object' && responseData !== null) {
          // Handle form submission format: { sectionId: { sectionId, sectionName, questions: { questionId: {...} } } } }
          for (const [sectionKey, sectionData] of Object.entries(
            responseData,
          )) {
            if (
              sectionData &&
              typeof sectionData === 'object' &&
              sectionData !== null &&
              !Array.isArray(sectionData)
            ) {
              const section = sectionData as any;
              
              // Check if it has 'questions' property (form submission format)
              if ('questions' in section && section.questions) {
                const questions = section.questions;
                
                // Handle both object and array formats for questions
                if (typeof questions === 'object' && !Array.isArray(questions)) {
                  // Object format: { questionId: { questionId, questionType, label, response } }
                  for (const [questionId, questionResponse] of Object.entries(
                    questions,
                  )) {
                    const qResp = questionResponse as any;
                    if (qResp && typeof qResp === 'object' && 'response' in qResp) {
                      let value = qResp.response;

                      const question = questionMap.get(questionId);
                      const formattedValue = this.formatResponseValue(
                        value,
                        qResp.questionType || question?.type,
                      );

                      row[questionId] = formattedValue;
                    }
                  }
                } else if (Array.isArray(questions)) {
                  // Array format: [{ questionId, questionType, label, response }, ...]
                  for (const questionResponse of questions) {
                    if (questionResponse && typeof questionResponse === 'object' && 'questionId' in questionResponse) {
                      const questionId = questionResponse.questionId;
                      let value = questionResponse.response;

                      const question = questionMap.get(questionId);
                      const formattedValue = this.formatResponseValue(
                        value,
                        questionResponse.questionType || question?.type,
                      );

                      row[questionId] = formattedValue;
                    }
                  }
                }
              } else if ('responses' in section && Array.isArray(section.responses)) {
                // Fallback: Handle nested responses array format
                for (const sectionResponse of section.responses) {
                  if (sectionResponse && typeof sectionResponse === 'object' && 'questionId' in sectionResponse) {
                    const questionId = sectionResponse.questionId;
                    let value = sectionResponse.response;

                    const question = questionMap.get(questionId);
                    const formattedValue = this.formatResponseValue(
                      value,
                      sectionResponse.questionType || question?.type,
                    );

                    row[questionId] = formattedValue;
                  }
                }
              }
            }
          }
        }
      }

      for (const column of columns) {
        if (!(column.key in row)) {
          row[column.key] = '';
        }
      }

      rows.push(row);
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${form.name}-${timestamp}`;

    const exportResult = await this.exportService.exportData(
      columns,
      rows,
      {
        type: 'excel',
        filename,
      },
      res,
    );

    if (!exportResult.success) {
      throw new BadRequestException(exportResult.error);
    }

    await this.auditLogService.log({
      userId,
      action: 'APPLICANT_PROCESS_DATA_DOWNLOADED',
      resource: 'ApplicantProcess',
      resourceId: processId,
      status: 'SUCCESS',
      details: { processId, formId, recordCount: rows.length },
    });
  }

  private formatResponseValue(value: any, questionType?: string): any {
    if (value === null || value === undefined || value === '') {
      return '';
    }


    switch (questionType) {
      case 'Paragraph':
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (parsed.blocks && Array.isArray(parsed.blocks)) {
              return parsed.blocks
                .map((block: any) => block.text || '')
                .join('\n');
            }
          } catch (e) {
            return value;
          }
        }

        if (
          typeof value === 'object' &&
          value.blocks &&
          Array.isArray(value.blocks)
        ) {
          return value.blocks.map((block: any) => block.text || '').join('\n');
        }
        return String(value);

      case 'Date':
        if (value instanceof Date) {
          return value.toISOString().split('T')[0];
        }
        if (typeof value === 'string') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }

        if (typeof value === 'object' && value !== null) {
          if (value.date) {
            const date = new Date(value.date);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
          return String(value);
        }
        return String(value);

      case 'DateTime':
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (typeof value === 'string') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }

        if (typeof value === 'object' && value !== null) {
          // Handle { date, time } format
          if (value.date && value.time) {
            try {
              // Parse date and time, combine them
              const dateStr = value.date;
              const timeStr = value.time;
              
              // Convert 12-hour format to 24-hour format if needed
              let hours = 0;
              let minutes = 0;
              const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
              if (timeMatch) {
                hours = parseInt(timeMatch[1], 10);
                minutes = parseInt(timeMatch[2], 10);
                const period = timeMatch[3].toUpperCase();
                if (period === 'PM' && hours !== 12) {
                  hours += 12;
                } else if (period === 'AM' && hours === 12) {
                  hours = 0;
                }
              } else {
                // Try 24-hour format
                const time24Match = timeStr.match(/(\d+):(\d+)/);
                if (time24Match) {
                  hours = parseInt(time24Match[1], 10);
                  minutes = parseInt(time24Match[2], 10);
                }
              }
              
              const date = new Date(dateStr);
              date.setHours(hours, minutes, 0, 0);
              if (!isNaN(date.getTime())) {
                return date.toISOString();
              }
            } catch (e) {
              // Fall through to other formats
            }
          }
          
          // Handle { dateTime } or { datetime } format
          if (value.dateTime || value.datetime) {
            const date = new Date(value.dateTime || value.datetime);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          }
          
          // Handle { date } format (without time)
          if (value.date && !value.time) {
            const date = new Date(value.date);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          }
          
          return String(value);
        }
        return String(value);

      case 'Time':
        if (typeof value === 'string') {
          return value;
        }
        if (value instanceof Date) {
          return value.toTimeString().split(' ')[0];
        }
        if (typeof value === 'object' && value !== null) {
          return String(value);
        }
        return String(value);

      case 'Checkbox':
        if (Array.isArray(value)) {
          const selectedOptions = value
            .filter(
              (item) =>
                item && typeof item === 'object' && item.checked === true,
            )
            .map((item) => item.option || '')
            .filter((option) => option);
          return selectedOptions.join(', ');
        }

        if (typeof value === 'string') {
          return value;
        }

        if (typeof value === 'object' && value !== null) {
          if (value.option && value.checked === true) {
            return value.option;
          }
          return String(value);
        }
        return String(value);

      case 'Number':
        if (typeof value === 'number') {
          return value;
        }
        if (typeof value === 'string') {
          const num = parseFloat(value);
          return isNaN(num) ? value : num;
        }
        return value;

      case 'Date Range':
        if (typeof value === 'string') {
          // Handle string format like "2025-01-01 - 2025-01-31"
          if (value.includes(' - ')) {
            return value;
          }
          return value;
        }
        if (typeof value === 'object' && value !== null) {
          // Handle { startDate, endDate } format
          if (value.startDate && value.endDate) {
            const startDate = value.startDate instanceof Date 
              ? value.startDate 
              : new Date(value.startDate);
            const endDate = value.endDate instanceof Date 
              ? value.endDate 
              : new Date(value.endDate);
            
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const startStr = startDate.toISOString().split('T')[0];
              const endStr = endDate.toISOString().split('T')[0];
              return `${startStr} - ${endStr}`;
            }
          }
        }
        return String(value);

      case 'Upload':
      case 'Signature':
        return '';

      default:
        // Handle objects that might be accidentally passed
        if (typeof value === 'object' && value !== null) {
          // Try to stringify if it's a plain object
          try {
            return JSON.stringify(value);
          } catch (e) {
            return String(value);
          }
        }
        return String(value);
    }
  }

  private getColumnTypeForQuestionType(
    questionType: string,
  ): 'string' | 'number' | 'date' | 'boolean' {
    switch (questionType) {
      case 'Number':
        return 'number';
      case 'Date':
      case 'DateTime':
      case 'Date Range':
        return 'date';
      case 'Checkbox':
        return 'boolean';
      default:
        return 'string';
    }
  }
}
