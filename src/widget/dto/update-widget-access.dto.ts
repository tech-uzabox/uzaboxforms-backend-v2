import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateWidgetAccessSchema = z.object({
  allowedUsers: z.array(z.string().uuid()).optional(),
  allowedRoles: z.array(z.string()).optional(),
});

export class UpdateWidgetAccessDto extends createZodDto(UpdateWidgetAccessSchema) {}
