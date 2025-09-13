import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { passwordSchema } from '../zod/password.zod';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
