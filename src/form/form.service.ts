import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Form, Prisma } from 'db/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateFormDto } from './dto/create-form.dto';
import { MoveFormDto } from './dto/move-form.dto';

@Injectable()
export class FormService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: CreateFormDto): Promise<Form> {
    const { name, type, status, creatorId, folderId, design } = data;
    const createData: any = {
      name,
      type,
      status,
      creator: { connect: { id: creatorId } },
      design,
    };
    if (folderId !== undefined) {
      createData.folder = { connect: { id: folderId } };
    }
    const newForm = await this.prisma.form.create({
      data: createData,
    });
    await this.auditLogService.log({
      userId: newForm.creatorId,
      action: 'FORM_CREATED',
      resource: 'Form',
      resourceId: newForm.id,
      status: 'SUCCESS',
      details: { name: newForm.name, type: newForm.type },
    });
    return newForm;
  }

  async findAll(folderId?: string): Promise<any[]> {
    const forms = await this.prisma.form.findMany({
      where: folderId ? { folderId } : undefined,
      include: { creator: true },
    });

    return forms;
  }

  async findOne(id: string): Promise<Form | null> {
    return this.prisma.form.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.FormUpdateInput): Promise<Form> {
    const updatedForm = await this.prisma.form.update({
      where: { id },
      data,
    });
    await this.auditLogService.log({
      userId: updatedForm.creatorId,
      action: 'FORM_UPDATED',
      resource: 'Form',
      resourceId: updatedForm.id,
      status: 'SUCCESS',
      details: { name: updatedForm.name, changes: data },
    });
    return updatedForm;
  }

  async remove(id: string): Promise<Form> {
    const deletedForm = await this.prisma.form.delete({ where: { id } });
    await this.auditLogService.log({
      userId: deletedForm.creatorId,
      action: 'FORM_DELETED',
      resource: 'Form',
      resourceId: deletedForm.id,
      status: 'SUCCESS',
      details: { name: deletedForm.name },
    });
    return deletedForm;
  }

  async fullDelete(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    return await this.prisma.$transaction(async (tx) => {
      // Find the form and all related processes
      const form = await tx.form.findUnique({
        where: { id },
        include: {
          processForms: {
            include: {
              process: {
                include: {
                  applicantProcesses: {
                    include: {
                      responses: true,
                      completedForms: true,
                      processedApplications: true,
                      comments: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!form) {
        throw new NotFoundException(`Form with ID ${id} not found`);
      }

      // Collect all process IDs that have this form
      const processIds = form.processForms.map(pf => pf.processId);

      // Delete all related data in the correct order (respecting foreign key constraints)
      for (const processId of processIds) {
        // Delete process comments
        await tx.processComment.deleteMany({
          where: {
            applicantProcess: {
              processId,
            },
          },
        });

        // Delete processed applications
        await tx.processedApplication.deleteMany({
          where: { processId },
        });

        // Delete AP completed forms
        await tx.aPCompletedForm.deleteMany({
          where: {
            applicantProcess: {
              processId,
            },
          },
        });

        // Delete form responses
        await tx.formResponse.deleteMany({
          where: { processId },
        });

        // Delete applicant processes
        await tx.applicantProcess.deleteMany({
          where: { processId },
        });

        // Delete process forms
        await tx.processForm.deleteMany({
          where: { processId },
        });

        // Delete process roles
        await tx.processRole.deleteMany({
          where: { processId },
        });

        // Delete the process itself
        await tx.process.delete({
          where: { id: processId },
        });
      }

      // Delete widgets that depend on this form
      console.log('Finding widgets that depend on form:', id);
      const widgetsToDelete = await tx.widget.findMany({
        where: {
          config: {
            path: ['metrics'],
            array_contains: [{ formId: id }],
          },
        },
      });
      console.log('Found widgets to delete:', widgetsToDelete.length);


      for (const widget of widgetsToDelete) {
        await tx.widget.delete({ where: { id: widget.id } });
      }


      // Delete the form
      await tx.form.delete({ where: { id } });

      // Log the full delete action
      await this.auditLogService.log({
        userId,
        action: 'FORM_FULL_DELETED',
        resource: 'Form',
        resourceId: id,
        status: 'SUCCESS',
        details: {
          formName: form.name,
          deletedProcesses: processIds.length,
          deletedApplicantProcesses: form.processForms.reduce((acc, pf) => acc + pf.process.applicantProcesses.length, 0),
          deletedWidgets: widgetsToDelete.length,
        },
      });

      return {
        success: true,
        message: `Form "${form.name}" and all associated data deleted successfully`,
      };
    });
  }

  async deleteFormProcessData(
    data: { processId: string; formId: string },
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return await this.prisma.$transaction(async (tx) => {
      const { processId, formId } = data;

      // Verify form and process exist
      const form = await tx.form.findUnique({ where: { id: formId } });
      if (!form) {
        throw new NotFoundException(`Form with ID ${formId} not found`);
      }

      const process = await tx.process.findUnique({ where: { id: processId } });
      if (!process) {
        throw new NotFoundException(`Process with ID ${processId} not found`);
      }

      // Delete all related data for this form in this process
      // Delete process comments for applicant processes in this process
      await tx.processComment.deleteMany({
        where: {
          applicantProcess: {
            processId,
          },
        },
      });

      // Delete processed applications for this form and process
      await tx.processedApplication.deleteMany({
        where: {
          processId,
          formId,
        },
      });

      // Delete AP completed forms for this form in this process
      await tx.aPCompletedForm.deleteMany({
        where: {
          applicantProcess: {
            processId,
          },
          formId,
        },
      });

      // Delete form responses for this form and process
      await tx.formResponse.deleteMany({
        where: {
          processId,
          formId,
        },
      });

      // Delete applicant processes for this process
      await tx.applicantProcess.deleteMany({
        where: { processId },
      });
      // Log the delete action
      await this.auditLogService.log({
        userId,
        action: 'FORM_PROCESS_DATA_DELETED',
        resource: 'FormProcessData',
        resourceId: `${formId}-${processId}`,
        status: 'SUCCESS',
        details: {
          formName: form.name,
          processName: process.name,
          formId,
          processId,
        },
      });

      return {
        success: true,
        message: `All data for form "${form.name}" in process "${process.name}" deleted successfully`,
      };
    });
  }

  async moveForm(data: MoveFormDto): Promise<Form> {
    const { formId, targetFolderId } = data;

    // Check if form exists
    const existingForm = await this.prisma.form.findUnique({
      where: { id: formId },
      include: { folder: true },
    });

    if (!existingForm) {
      throw new NotFoundException(`Form with ID ${formId} not found.`);
    }

    // Check if target folder exists
    const targetFolder = await this.prisma.folder.findUnique({
      where: { id: targetFolderId },
    });

    if (!targetFolder) {
      throw new NotFoundException(`Target folder with ID ${targetFolderId} not found.`);
    }

    // Update the form's folder
    const updatedForm = await this.prisma.form.update({
      where: { id: formId },
      data: {
        folderId: targetFolderId,
      },
      include: { folder: true },
    });

    // Log the move action
    await this.auditLogService.log({
      userId: updatedForm.creatorId,
      action: 'FORM_MOVED',
      resource: 'Form',
      resourceId: updatedForm.id,
      status: 'SUCCESS',
      details: {
        formName: updatedForm.name,
        fromFolder: existingForm.folder?.name || 'No folder',
        toFolder: updatedForm.folder?.name || 'No folder',
      },
    });

    return updatedForm;
  }

  async duplicate(formId: string, creatorId: string): Promise<Form> {
    const originalForm = await this.prisma.form.findUnique({
      where: { id: formId },
    });

    if (!originalForm) {
      throw new NotFoundException(`Form with ID ${formId} not found.`);
    }

    let newFormName = `${originalForm.name} - Copy`;
    let counter = 1;
    while (await this.prisma.form.findFirst({ where: { name: newFormName } })) {
      counter++;
      newFormName = `${originalForm.name} - Copy (${counter})`;
    }

    const duplicatedForm = await this.prisma.form.create({
      data: {
        name: newFormName,
        type: originalForm.type,
        status: originalForm.status,
        archived: originalForm.archived,
        creatorId: creatorId,
        folderId: originalForm.folderId,
        design: originalForm.design || Prisma.JsonNull, // Duplicate the design as JSON
      },
    });
    await this.auditLogService.log({
      userId: creatorId,
      action: 'FORM_DUPLICATED',
      resource: 'Form',
      resourceId: duplicatedForm.id,
      status: 'SUCCESS',
      details: { originalFormId: formId, newFormName: duplicatedForm.name },
    });
    return duplicatedForm;
  }

  async getPublicForms(): Promise<any[]> {
    const publicForms = await this.prisma.form.findMany({
      where: { type: 'PUBLIC' },
      include: { creator: true },
    });

    return publicForms.map((form) => {
      const formDesign = form.design ? true : false;
      return {
        id: form.id,
        name: form.name,
        status: form.status,
        createdBy: form.creator
          ? {
              firstName: form.creator.firstName,
              lastName: form.creator.lastName,
            }
          : null,
        formCreated: formDesign,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      };
    });
  }

  async getFormsWithCountries(): Promise<any> {
    try {
      const forms = await this.prisma.form.findMany({
        where: {
          design: {
            not: Prisma.JsonNull,
          },
        },
      });

      const resultMap = new Map<
        string,
        { formId: string; countryFields: { id: string; label: string }[] }
      >();

      for (const form of forms) {
        const formId = form.id;
        const countryFields: { id: string; label: string }[] = [];

        if (form.design && typeof form.design === 'object') {
          const design = form.design as any;
          if (Array.isArray(design)) {
            for (const section of design) {
              if (Array.isArray(section?.questions)) {
                for (const question of section.questions) {
                  if (question?.type === 'Countries') {
                    countryFields.push({
                      id: question.id,
                      label: question.label || question.id,
                    });
                  }
                }
              }
            }
          }
        }

        if (countryFields.length > 0) {
          const existing = resultMap.get(formId);
          if (existing) {
            const merged = [...existing.countryFields, ...countryFields];
            const unique = Array.from(
              new Map(merged.map((cf) => [cf.id, cf])).values(),
            );
            resultMap.set(formId, { formId, countryFields: unique });
          } else {
            resultMap.set(formId, { formId, countryFields });
          }
        }
      }

      const formIds = Array.from(resultMap.keys());
      const formsWithNames = await this.prisma.form.findMany({
        where: {
          id: { in: formIds },
        },
        select: {
          id: true,
          name: true,
        },
      });

      const nameMap = new Map(formsWithNames.map((f) => [f.id, f.name]));

      const data = Array.from(resultMap.values()).map((item) => ({
        id: item.formId,
        name: nameMap.get(item.formId) || '',
        countryFields: item.countryFields,
      }));

      return { success: true, data };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch forms with countries',
      );
    }
  }

  async getFormFields(formId: string) {
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) {
      throw new NotFoundException(`Form with ID ${formId} not found`);
    }
    const systemFields = [
      { id: '$responseId$', label: 'Response ID', type: 'text' },
      { id: '$submissionDate$', label: 'Submission Date', type: 'date' },
    ];
    let formFields: any[] = [];
    if (form.design) {
      const design = form.design as any;
      if (Array.isArray(design)) {
        design.forEach((section: any) => {
          if (Array.isArray(section.questions)) {
            section.questions.forEach((question: any) => {
              const type = this.mapQuestionTypeToFieldType(question.type);
              formFields.push({
                id: question.id,
                label: question.label || question.id,
                type,
                required: question.required || false,
                options: question.options || [],
              });
            });
          }
        });
      }
    }
    return {
      formId,
      fields: [...systemFields, ...formFields],
      systemFields,
      formFields,
    };
  }

  async getMultipleFormFields(formIds: string[]) {
    const result: any = {};
    const allFields: any[] = [];
    for (const id of formIds) {
      const data = await this.getFormFields(id);
      result[id] = data;
      allFields.push(...data.fields);
    }
    const uniqueFields = Array.from(
      new Map(allFields.map((f) => [f.id as string, f])).values(),
    );
    const systemFields = result[Object.keys(result)[0]]?.systemFields || [];
    const formFields = allFields.filter((f) => !f.id.startsWith('$'));
    return {
      allFields: uniqueFields,
      byForm: result,
      systemFields,
      formFields,
    };
  }

  async getGenerationProgress(jobId: string, userId: string) {
    const progress = await this.prisma.formGenerationProgress.findFirst({
      where: {
        jobId,
        userId,
      },
    });

    if (!progress) {
      throw new NotFoundException('Progress record not found');
    }

    return {
      success: true,
      data: progress,
    };
  }

  mapQuestionTypeToFieldType(questionType: string): string {
    const typeMapping: { [key: string]: string } = {
      // Text types
      textfield: 'text',
      textarea: 'text',
      email: 'text',
      url: 'text',
      phone: 'text',
      paragraph: 'text',

      // Numeric types
      number: 'number',
      currency: 'number',
      calculation: 'number',

      // Date/time types
      datetime: 'datetime',
      date: 'date',
      time: 'time',

      // Selection types
      dropdown: 'select',
      radio: 'select',
      checkbox: 'multiselect',
      select: 'select',
      multiselect: 'multiselect',

      // Boolean types
      yesno: 'boolean',
      boolean: 'boolean',

      // File types
      file: 'file',
      image: 'file',
      document: 'file',

      // Other types
      signature: 'file',
      location: 'text',
      rating: 'number',
    };

    return typeMapping[questionType.toLowerCase()] || 'text';
  }
}
