// Form input types and schemas for AI form generation
export const formInputTypes = [
  {
    type: 'short text input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'Short Text',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
    },
  },
  {
    type: 'email text input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'Email',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
    },
  },
  {
    type: 'phone number text input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'Phone Number',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
    },
  },
  {
    type: 'long text (paragraph) input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'Paragraph',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
    },
  },
  {
    type: 'number input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'Number',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
    },
  },
  {
    type: 'checkbox input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'Checkbox',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
      options: {
        required: true,
        dataType: 'string array',
        description: 'here is where you put all the option of the question',
      },
      numberOfOptions: {
        required: true,
        dataType: 'number',
        description:
          'here is where you put the number of options it number of options should match the options array',
      },
      selectOptions: {
        required: true,
        dataType: 'select-at-least | select-at-most | select-exactly',
        description: 'this determines how many options should be selected',
      },
    },
  },
  {
    type: 'date input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'Date',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
      timeType: {
        required: true,
        value: 'all-time | future-only | past-only',
        note: 'this is used to determine the date boundaries where the date will be selected from, if not sure set the value to all-time, for example date of birth should be past-only',
      },
      useTimezone: {
        required: false,
        dataType: 'boolean',
        description: 'whether to use a specific timezone for this date question',
      },
      timezone: {
        required: false,
        dataType: 'string',
        description: 'the timezone to use for this date question (e.g., "America/New_York", "Europe/London", "UTC")',
      },
    },
  },
  {
    type: 'datetime input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'DateTime',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
      timeType: {
        required: true,
        value: 'all-time | future-only | past-only',
        note: 'this is used to determine the date boundaries where the date will be selected from, if not sure set the value to all-time, for example date of birth should be past-only',
      },
      useTimezone: {
        required: false,
        dataType: 'boolean',
        description: 'whether to use a specific timezone for this datetime question',
      },
      timezone: {
        required: false,
        dataType: 'string',
        description: 'the timezone to use for this datetime question (e.g., "America/New_York", "Europe/London", "UTC")',
      },
    },
  },
  {
    type: 'date range input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'Date Range',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
      useTimezone: {
        required: false,
        dataType: 'boolean',
        description: 'whether to use a specific timezone for this date range question',
      },
      timezone: {
        required: false,
        dataType: 'string',
        description: 'the timezone to use for this date range question (e.g., "America/New_York", "Europe/London", "UTC")',
      },
    },
  },
  {
    type: 'time input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'Time',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
      useTimezone: {
        required: false,
        dataType: 'boolean',
        description: 'whether to use a specific timezone for this time question',
      },
      timezone: {
        required: false,
        dataType: 'string',
        description: 'the timezone to use for this time question (e.g., "America/New_York", "Europe/London", "UTC")',
      },
    },
  },
  {
    type: 'signature input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'Signature',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
    },
  },
  {
    type: 'select (dropdown) input',
    schema: {
      label: {
        required: true,
        dataType: 'string',
        description:
          'question label, make sure it stays as original as possible, do not change the language',
      },
      type: {
        required: true,
        value: 'Dropdown',
        dataType: 'string',
        note: 'set it to the value specified in the schema literaly',
        description: 'this is a unique identifier for the question type',
      },
      required: {
        required: true,
        dataType: 'yes | no',
        description:
          'whether or not the question is option, if unsure, set it to yes',
      },
      options: {
        required: true,
        dataType: 'string array',
        description: 'here is where you put all the option of the question',
      },
    },
  },
];

// Zod schemas for form generation
import { z } from 'zod';

const SectionSchema = z.object({
  name: z.string(),
  id: z
    .string()
    .nullable()
    .describe(
      'unique identifier for the section, used when linking it with the next section',
    ),
  nextSectionId: z
    .string()
    .nullable()
    .describe(
      'unique identified that links the current section to the next section, the last section does not have a nextsection, set it to null',
    ),
  questions: z
    .array(
      z.object({
        label: z.string(),
        type: z.string(),
        required: z.enum(['yes', 'no']),
        options: z.array(z.string()).nullable(),
        timeType: z.enum(['all-time', 'future-only', 'past-only']).nullable(),
        selectOptions: z
          .enum(['select-at-least', 'select-at-most', 'select-exactly'])
          .nullable(),
        numberOfOptions: z.number().nullable(),
      }),
    )
    .describe('Questions schema according to the input type schema'),
});

export const SectionSchemaV2 = z.object({
  name: z.string(),
  id: z
    .string()
    .nullable()
    .describe(
      'unique identifier for the section, used when linking it with the next section',
    ),
  nextSectionId: z
    .string()
    .nullable()
    .describe(
      'unique identified that links the current section to the next section, the last section does not have a nextsection, set it to null',
    ),
  questions: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.string(),
        required: z.enum(['yes', 'no']),
        options: z.array(z.string()).nullable(),
        timeType: z.enum(['all-time', 'future-only', 'past-only']).nullable(),
        selectOptions: z
          .enum(['select-at-least', 'select-at-most', 'select-exactly'])
          .nullable(),
        numberOfOptions: z.number().nullable(),
      }),
    )
    .describe('Questions schema according to the input type schema'),
});

export const FormSchema = z.object({
  sections: z.array(SectionSchema),
});

export const GeneratedFormSchema = z.object({
  formId: z.string().describe('The form id'),
  name: z.string().describe('name of the form'),
  sections: z.array(SectionSchemaV2).describe('form sections'),
});

// Type definitions
export interface FormSection {
  id: string;
  name: string;
  questions: FormQuestion[];
}

export interface FormQuestion {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

export interface GeneratedFormData {
  formId: string;
  name: string;
  sections: FormSection[];
}

export interface ProcessData {
  name: string;
  type: 'PRIVATE' | 'PUBLIC';
  groupId: string;
  staffViewForms: 'YES' | 'NO';
  applicantViewProcessLevel: 'YES' | 'NO';
}

export interface RolesData {
  roles: string[];
}

export interface StepData {
  stepId: string;
  formId: string;
  nextStepType:
    | 'STATIC'
    | 'DYNAMIC'
    | 'FOLLOW_ORGANIZATION_CHART'
    | 'NOT_APPLICABLE';
  nextStepRoles?: string[];
  nextStaff?: string;
  notificationType:
    | 'STATIC'
    | 'DYNAMIC'
    | 'FOLLOW_ORGANIZATION_CHART'
    | 'NOT_APPLICABLE';
  notificationTo?: string;
  notificationToRoles?: string[];  // Fixed: was notificationRoles
  notificationComment?: string;
  editApplicationStatus: boolean;
  applicantViewFormAfterCompletion: boolean;
  notifyApplicant: boolean;
  applicantNotificationContent: string;
}

export interface StoredStepData {
  processId: string;
  formId: string;
  nextStepType:
    | 'STATIC'
    | 'DYNAMIC'
    | 'FOLLOW_ORGANIZATION_CHART'
    | 'NOT_APPLICABLE';
  nextStepRoles?: string[];
  nextStaff?: string;
  notificationType:
    | 'STATIC'
    | 'DYNAMIC'
    | 'FOLLOW_ORGANIZATION_CHART'
    | 'NOT_APPLICABLE';
  notificationTo?: string;
  notificationToRoles?: string[];
  notificationComment?: string;
  editApplicationStatus: boolean;
  applicantViewFormAfterCompletion: boolean;
  notifyApplicant: boolean;
  applicantNotificationContent: string;
}
