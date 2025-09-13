
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  roles: z.array(z.string().uuid()).optional(),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
