
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateProcessRoleSchema = z.object({
  processId: z.string().uuid(),
  roleId: z.string().uuid(),
});

export class CreateProcessRoleDto extends createZodDto(CreateProcessRoleSchema) {}
