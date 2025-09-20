import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const BulkRefreshWidgetsSchema = z.object({
  widgetIds: z.array(z.string().uuid()).min(1),
});

export class BulkRefreshWidgetsDto extends createZodDto(BulkRefreshWidgetsSchema) {}
