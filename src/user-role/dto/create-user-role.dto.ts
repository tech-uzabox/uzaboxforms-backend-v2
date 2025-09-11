import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateUserRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

export class CreateUserRoleDto extends createZodDto(CreateUserRoleSchema) {}
