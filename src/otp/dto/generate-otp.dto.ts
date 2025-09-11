
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GenerateOtpSchema = z.object({
  email: z.string().email(),
});

export class GenerateOtpDto extends createZodDto(GenerateOtpSchema) {}
