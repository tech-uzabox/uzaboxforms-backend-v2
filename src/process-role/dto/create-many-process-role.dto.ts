
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateManyProcessRoleSchema = z.array(z.object({
  processId: z.string().uuid(),
  roleId: z.string().uuid(),
}));

export class CreateManyProcessRoleDto extends createZodDto(CreateManyProcessRoleSchema) {}
