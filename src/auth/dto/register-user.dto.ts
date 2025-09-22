import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { passwordSchema } from '../zod/password.zod';

const RegisterUserSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
});

export class RegisterUserDto extends createZodDto(RegisterUserSchema) {}
