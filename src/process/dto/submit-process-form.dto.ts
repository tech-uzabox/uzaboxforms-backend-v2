
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SubmitProcessFormSchema = z.object({
  processId: z.string().uuid(),
  staffViewForms: z.boolean(),
  applicantViewProcessLevel: z.boolean(),
  processForms: z.array(z.object({
    formId: z.string().uuid(),
    order: z.number().int().positive(),
    nextStepType: z.string(), // This should be an enum in Prisma
    nextStaffId: z.string().uuid().optional(),
    nextStepRoles: z.array(z.string()).optional(),
    notificationType: z.string().optional(), // This should be an enum in Prisma
    notificationRoles: z.array(z.string()).optional(),
    notificationToId: z.string().uuid().optional(),
    notificationComment: z.string().optional(),
    notifyApplicant: z.boolean().optional(),
    applicantNotificationContent: z.string().optional(),
  })),
});

export class SubmitProcessFormDto extends createZodDto(SubmitProcessFormSchema) {}
