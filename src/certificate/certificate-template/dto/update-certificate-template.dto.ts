import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateCertificateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  templateFileUrl: z.string().min(1).optional(),
  certificateNumberFormat: z.record(z.string(), z.any()).optional(),
  approvalCondition: z
    .object({
      formId: z.string().uuid(),
      questionId: z.string(),
      operator: z.enum(['equals', 'contains', 'greaterThan', 'lessThan', 'notEquals']),
      expectedValue: z.any(),
    })
    .optional(),
  enableCertificateGeneration: z.boolean().optional(),
  validityType: z.enum(['FOREVER', 'FIXED_YEARS', 'CUSTOM']).optional(),
  validityYears: z.number().int().positive().optional().nullable(),
  customValidityDays: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export class UpdateCertificateTemplateDto extends createZodDto(
  UpdateCertificateTemplateSchema,
) {}

