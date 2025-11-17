import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateCertificateTemplateSchema = z.object({
  processId: z.string().uuid(),
  name: z.string().min(1),
  templateFileUrl: z.string().min(1),
  certificateNumberFormat: z.record(z.string(), z.any()),
  approvalCondition: z.object({
    formId: z.string().uuid(),
    questionId: z.string(),
    operator: z.enum(['equals', 'contains', 'greaterThan', 'lessThan', 'notEquals']),
    expectedValue: z.any(),
  }),
  enableCertificateGeneration: z.boolean().default(false),
  validityType: z.enum(['FOREVER', 'FIXED_YEARS', 'CUSTOM']).default('FOREVER'),
  validityYears: z.number().int().positive().optional().nullable(),
  customValidityDays: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

export class CreateCertificateTemplateDto extends createZodDto(
  CreateCertificateTemplateSchema,
) {}

