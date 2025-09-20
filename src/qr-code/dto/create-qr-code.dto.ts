
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateQrCodeSchema = z.object({
  documentName: z.string(),
  host: z.string().url(),
});

export class CreateQrCodeDto extends createZodDto(CreateQrCodeSchema) {}
