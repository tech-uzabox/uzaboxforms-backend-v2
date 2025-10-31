import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { passwordSchema } from '../zod/password.zod';

const RegisterUserSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
});

export class RegisterUserDto extends createZodDto(RegisterUserSchema) {}
