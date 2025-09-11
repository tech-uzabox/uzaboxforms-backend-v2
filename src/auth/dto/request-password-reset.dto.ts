
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RequestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export class RequestPasswordResetDto extends createZodDto(RequestPasswordResetSchema) {}
