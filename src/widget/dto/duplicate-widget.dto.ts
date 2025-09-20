import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DuplicateWidgetSchema = z.object({
  sourceWidgetId: z.string().uuid(),
  dashboardId: z.string().uuid(),
  title: z.string().min(1).optional(),
});

export class DuplicateWidgetDto extends createZodDto(DuplicateWidgetSchema) {}
