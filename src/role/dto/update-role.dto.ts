
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateRoleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['ENABLED', 'DISABLED']).optional(),
});

export class UpdateRoleDto extends createZodDto(UpdateRoleSchema) {}
