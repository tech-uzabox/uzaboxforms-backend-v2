import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

export interface FormField {
  id: string;
  label: string;
  type: string;
  formId: string;
  sectionId: string;
  sectionName: string;
  isSystemField?: boolean;
  options?: string[];
  required?: boolean;
}

export interface SystemField extends Omit<FormField, 'formId' | 'sectionId' | 'sectionName'> {
  isSystemField: true;
}

// System fields that are always available for any form response
const SYSTEM_FIELDS: SystemField[] = [
  {
    id: '$responseId$',
    label: 'Response ID',
    type: 'text',
    isSystemField: true,
    required: false
  },
  {
    id: '$submissionDate$',
    label: 'Submission Date',
    type: 'datetime',
    isSystemField: true,
    required: false
  }
];

@Injectable()
export class FormFieldsService {
  constructor(private prisma: PrismaService) {}

  async getFormFields(formId: string, userId: string) {
    // Validate form ID
    if (!formId) {
      throw new BadRequestException('Invalid form ID');
    }

    // Find the form
    const form = await this.prisma.form.findUnique({
      where: { id: formId }
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    console.log(form)

    let fields: FormField[] = [];

    // Add system fields first
    const systemFields = SYSTEM_FIELDS.map(field => ({
      ...field,
      formId,
      sectionId: 'system',
      sectionName: 'System Fields'
    }));
    // fields.push(...systemFields);
    console.log(form)
    // Extract fields from form design
    if (form.design && Array.isArray(form.design)) {
      for (const section of form.design) {
        if (section && typeof section === 'object' && 'questions' in section) {
          const sectionObj = section as any;
          if (sectionObj.questions && Array.isArray(sectionObj.questions)) {
            for (const question of sectionObj.questions) {
              if (question && typeof question === 'object' && question.id && question.type) {
                const field: FormField = {
                  id: question.id,
                  label: question.label || question.titleName || question.id,
                  type: this.mapQuestionTypeToFieldType(question.type),
                  formId,
                  sectionId: sectionObj.id || 'unknown',
                  sectionName: sectionObj.name || 'Unnamed Section',
                  isSystemField: false,
                  required: question.required === 'true' || question.required === true
                };

                // Add options for dropdown/select fields
                if (question.options && Array.isArray(question.options)) {
                  field.options = question.options;
                }

                fields.push(field);
              }
            }
          }
        }
      }
    }

    // Filter out file fields as per original logic
    fields = fields.filter(f => f.type !== "file");

    return {
      success: true,
      data: {
        formId,
        fields,
        systemFields: SYSTEM_FIELDS,
        formFields: fields.filter(f => !f.isSystemField)
      }
    };
  }

  async getMultipleFormFields(formIds: string[], userId: string) {
    if (!formIds || formIds.length === 0) {
      throw new BadRequestException('Form IDs are required');
    }

    const validFormIds = formIds.filter(id => id && id.length === 36);

    if (validFormIds.length === 0) {
      throw new BadRequestException('No valid form IDs provided');
    }

    const formFieldsMap: { [formId: string]: FormField[] } = {};
    const allFields: FormField[] = [];

    // Process each form
    for (const formId of validFormIds) {
      try {
        const result = await this.getFormFields(formId, userId);
        formFieldsMap[formId] = result.data.fields;
        allFields.push(...result.data.fields);
      } catch (error) {
        // Skip forms that can't be found or processed
        continue;
      }
    }

    return {
      success: true,
      data: {
        formFieldsMap,
        allFields,
        systemFields: SYSTEM_FIELDS
      }
    };
  }

  /**
   * Map form question types to standardized field types for widget use
   */
  private mapQuestionTypeToFieldType(questionType: string): string {
    const typeMapping: { [key: string]: string } = {
      // Text types
      'textfield': 'text',
      'textarea': 'text',
      'email': 'text',
      'url': 'text',
      'phone': 'text',
      'paragraph': 'text',

      // Numeric types
      'number': 'number',
      'currency': 'number',
      'calculation': 'number',

      // Date/time types
      'datetime': 'datetime',
      'date': 'date',
      'time': 'time',

      // Selection types
      'dropdown': 'select',
      'radio': 'select',
      'checkbox': 'multiselect',
      'select': 'select',
      'multiselect': 'multiselect',

      // Boolean types
      'yesno': 'boolean',
      'boolean': 'boolean',

      // File types
      'file': 'file',
      'image': 'file',
      'document': 'file',

      // Other types
      'signature': 'file',
      'location': 'text',
      'rating': 'number'
    };

    return typeMapping[questionType.toLowerCase()] || 'text';
  }
}
