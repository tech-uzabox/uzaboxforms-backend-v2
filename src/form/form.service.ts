import { Injectable, NotFoundException } from '@nestjs/common';
import { Form, Prisma } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateFormDto } from './dto/create-form.dto';

@Injectable()
export class FormService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: CreateFormDto): Promise<Form> {
    const { name, type, status, creatorId, design } = data;
    const newForm = await this.prisma.form.create({
      data: {
        name,
        type,
        status,
        creator: { connect: { id: creatorId } },
        design,
      },
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

  async findAll(): Promise<Form[]> {
    return this.prisma.form.findMany();
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

  async getFormsWithCountries(): Promise<any[]> {
    const forms = await this.prisma.form.findMany({
      where: {
        design: {
          not: Prisma.JsonNull,
        },
      },
    });

    const resultMap = new Map<string, { formId: string; countryFields: { id: string; label: string }[] }>();

    for (const form of forms) {
      const formId = form.id;
      const countryFields: { id: string; label: string }[] = [];

      if (form.design && typeof form.design === 'object') {
        const design = form.design as any;
        if (Array.isArray(design.sections)) {
          for (const section of design.sections) {
            if (Array.isArray(section?.questions)) {
              for (const question of section.questions) {
                if (question?.type === "Countries") {
                  countryFields.push({ id: question.id, label: question.label || question.id });
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
          const unique = Array.from(new Map(merged.map(cf => [cf.id, cf])).values());
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

    const nameMap = new Map(formsWithNames.map(f => [f.id, f.name]));

    return Array.from(resultMap.values()).map(item => ({
      _id: item.formId,
      formName: nameMap.get(item.formId) || "",
      countryFields: item.countryFields,
    }));
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
      if (Array.isArray(design.sections)) {
        design.sections.forEach((section: any) => {
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
    const uniqueFields = Array.from(new Map(allFields.map(f => [f.id as string, f])).values());
    const systemFields = result[Object.keys(result)[0]]?.systemFields || [];
    const formFields = allFields.filter(f => !f.id.startsWith('$'));
    return {
      allFields: uniqueFields,
      byForm: result,
      systemFields,
      formFields,
    };
  }

  mapQuestionTypeToFieldType(questionType: string): string {
    switch (questionType) {
      case 'text':
      case 'textarea':
      case 'email':
      case 'number':
      case 'phoneNumber':
      case 'url':
        return 'text';
      case 'select':
      case 'dropdown':
      case 'radio':
        return 'select';
      case 'checkbox':
      case 'yesno':
        return 'boolean';
      case 'date':
      case 'time':
      case 'datetime':
      case 'dateRange':
        return 'date';
      default:
        return 'text';
    }
  }
}
