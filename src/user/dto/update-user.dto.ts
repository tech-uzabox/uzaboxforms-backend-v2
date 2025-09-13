
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: z.enum(['ENABLED', 'DISABLED', 'PENDING']).optional(),
  roles: z.array(z.string().uuid()).optional(),
});

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
