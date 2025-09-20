import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateWidgetSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  visualizationType: z.enum(['card', 'bar', 'line', 'pie', 'histogram', 'scatter', 'calendar-heatmap', 'map']).optional(),
  config: z.any().optional(),
  order: z.number().int().min(0).optional(),
});

export class UpdateWidgetDto extends createZodDto(UpdateWidgetSchema) {}
