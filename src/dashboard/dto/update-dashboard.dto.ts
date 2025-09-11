
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateDashboardSchema = z.object({
  name: z.string().optional(),
  allowedUsers: z.array(z.string().uuid()).optional(),
  allowedRoles: z.array(z.string()).optional(),
  layout: z.any().optional(),
});

export class UpdateDashboardDto extends createZodDto(UpdateDashboardSchema) {}
