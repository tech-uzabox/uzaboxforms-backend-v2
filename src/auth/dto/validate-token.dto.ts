import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ValidateTokenSchema = z.object({
  token: z.string().min(1),
});

export class ValidateTokenDto extends createZodDto(ValidateTokenSchema) {}
