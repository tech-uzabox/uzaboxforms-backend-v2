
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateDashboardSchema = z.object({
  name: z.string(),
  ownerId: z.string().uuid(),
  allowedUsers: z.array(z.string().uuid()).optional(),
  allowedRoles: z.array(z.string()).optional(),
  layout: z.any().optional(),
});

export class CreateDashboardDto extends createZodDto(CreateDashboardSchema) {}
