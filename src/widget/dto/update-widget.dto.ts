import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateWidgetSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  visualizationType: z.enum(['card', 'bar', 'line', 'pie', 'histogram', 'scatter', 'calendar-heatmap', 'map', 'group']).optional(),

  // Enhanced multi-metric structure
  metrics: z.array(z.any()).optional(),
  metricMode: z.enum(['aggregation', 'value']).optional(),
  sources: z.array(z.any()).optional(),
  aggregation: z.enum(['count', 'sum', 'mean', 'median', 'mode', 'min', 'max', 'std', 'variance', 'p10', 'p25', 'p50', 'p75', 'p90']).optional(),
  groupBy: z.any().optional(),
  dateRange: z.any().optional(),
  filters: z.array(z.any()).optional(),
  topN: z.number().int().min(5).max(20).optional(),
  sort: z.enum(['alpha-asc', 'alpha-desc', 'value-asc', 'value-desc', 'time-asc', 'time-desc']).optional(),
  combinationMode: z.string().optional(),
  appearance: z.any().optional(),
  options: z.any().optional(),
  realTime: z.any().optional(),
  order: z.number().int().min(0).optional(),
  valueModeFieldId: z.string().optional(),

  // New config field for processed data
  config: z.any().optional(),
});

export class UpdateWidgetDto extends createZodDto(UpdateWidgetSchema) {}
