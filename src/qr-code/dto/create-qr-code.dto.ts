
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateQrCodeSchema = z.object({
  documentName: z.string(),
  fileName: z.string(),
  qrCodeId: z.string(),
  creatorId: z.string().uuid(),
});

export class CreateQrCodeDto extends createZodDto(CreateQrCodeSchema) {}
