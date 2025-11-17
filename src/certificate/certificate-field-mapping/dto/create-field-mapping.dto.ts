import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateFieldMappingSchema = z.object({
  certificateTemplateId: z.string().uuid(),
  fieldType: z.enum(['NAME', 'CERT_NUMBER', 'ISSUE_DATE', 'EXPIRY_DATE', 'QR_CODE', 'CUSTOM']),
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive().optional().nullable(),
  height: z.number().positive().optional().nullable(),
  fontSize: z.number().positive().optional().nullable(),
  fontFamily: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  alignment: z.string().optional().nullable(),
  sourceFormId: z.string().uuid().optional().nullable(),
  sourceQuestionId: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
});

export class CreateFieldMappingDto extends createZodDto(CreateFieldMappingSchema) {}

