
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateQrCodeSchema = z.object({
  documentName: z.string().optional(),
  fileName: z.string().optional(),
});

export class UpdateQrCodeDto extends createZodDto(UpdateQrCodeSchema) {}
