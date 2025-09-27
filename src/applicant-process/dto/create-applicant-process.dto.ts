import { NextStepType } from 'db/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateApplicantProcessSchema = z.object({
  applicantId: z.string().uuid(),
  processId: z.string().uuid(),
  formId: z.string().uuid(),
  responses: z.record(z.string(), z.any()),
  nextStaffId: z.string().uuid().optional(),
  nextStepType: z.nativeEnum(NextStepType).optional(),
  nextStepRoles: z.array(z.string()).optional(),
  nextStepSpecifiedTo: z.string().optional(),
  notificationType: z.nativeEnum(NextStepType).optional(),
  notificationToId: z.string().uuid().optional(),
  notificationToRoles: z.array(z.string()).optional(),
  notificationComment: z.string().optional(),
});

export class CreateApplicantProcessDto extends createZodDto(
  CreateApplicantProcessSchema,
) {}
