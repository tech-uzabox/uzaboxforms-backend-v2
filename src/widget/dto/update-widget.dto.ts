import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Crosstab schemas (validate if provided)
const CrosstabValueAgg = z.enum([
  'count', 'sum', 'mean', 'median', 'mode', 'min', 'max', 'std', 'variance',
  'p10', 'p25', 'p50', 'p75', 'p90'
]);

const CrosstabCategorySchema = z.object({
  formId: z.string().uuid(),
  fieldId: z.string().optional(),
  systemField: z.string().optional(),
  includeMissing: z.boolean().optional().default(false),
}).refine(d => !!d.fieldId || !!d.systemField, {
  message: 'Either fieldId or systemField must be provided',
  path: ['field'],
});

const CrosstabValueSchema = z.object({
  formId: z.string().uuid(),
  fieldId: z.string().optional(),
  systemField: z.string().optional(),
  aggregation: CrosstabValueAgg,
}).refine(d => !!d.fieldId || !!d.systemField, {
  message: 'Either fieldId or systemField must be provided',
  path: ['field'],
});

const CrosstabSchema = z.object({
  row: CrosstabCategorySchema,
  column: CrosstabCategorySchema,
  value: CrosstabValueSchema,
  rowAxisTitle: z.string().optional(),
  colAxisTitle: z.string().optional(),
});

const UpdateWidgetSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  visualizationType: z.enum(['card', 'bar', 'line', 'pie', 'histogram', 'scatter', 'calendar-heatmap', 'map', 'group', 'crosstab', 'cct']).optional(),

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

  // Allow direct crosstab updates for convenience (transform will nest into options)
  crosstab: CrosstabSchema.optional(),

  // CCT schemas (validate if provided)
  cct: z.object({
    formId: z.string().uuid(),
    factors: z.array(z.object({
      fieldId: z.string(),
      label: z.string().optional(),
    })).min(1),
    measures: z.array(z.object({
      id: z.string().optional(),
      fieldId: z.string(),
      aggregation: CrosstabValueAgg,
      label: z.string().optional(),
    })).min(1),
  }).optional(),

  // New config field for processed data
  config: z.any().optional(),
}).superRefine((data, ctx) => {
  // If options.crosstab is provided, validate its shape
  const cx = (data.options as any)?.crosstab;
  if (cx !== undefined) {
    const res = CrosstabSchema.safeParse(cx);
    if (!res.success) {
      for (const issue of res.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: ['options', 'crosstab', ...(issue.path as (string | number)[])],
        });
      }
    }
  }
  // If a direct crosstab field is provided, validate as well
  if (data.crosstab !== undefined) {
    const res2 = CrosstabSchema.safeParse(data.crosstab);
    if (!res2.success) {
      for (const issue of res2.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: ['crosstab', ...(issue.path as (string | number)[])],
        });
      }
    }
  }

  // If options.cct is provided, validate its shape
  const cct = (data.options as any)?.cct;
  if (cct !== undefined) {
    const cctSchema = z.object({
      formId: z.string().uuid(),
      factors: z.array(z.object({
        fieldId: z.string(),
        label: z.string().optional(),
      })).min(1),
      measures: z.array(z.object({
        id: z.string().optional(),
        fieldId: z.string(),
        aggregation: CrosstabValueAgg,
        label: z.string().optional(),
      })).min(1),
    });
    const res = cctSchema.safeParse(cct);
    if (!res.success) {
      for (const issue of res.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: ['options', 'cct', ...(issue.path as (string | number)[])],
        });
      }
    }
  }
  // If a direct cct field is provided, validate as well
  if (data.cct !== undefined) {
    const cctSchema = z.object({
      formId: z.string().uuid(),
      factors: z.array(z.object({
        fieldId: z.string(),
        label: z.string().optional(),
      })).min(1),
      measures: z.array(z.object({
        id: z.string().optional(),
        fieldId: z.string(),
        aggregation: CrosstabValueAgg,
        label: z.string().optional(),
      })).min(1),
    });
    const res2 = cctSchema.safeParse(data.cct);
    if (!res2.success) {
      for (const issue of res2.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: ['cct', ...(issue.path as (string | number)[])],
        });
      }
    }
  }
});

export class UpdateWidgetDto extends createZodDto(UpdateWidgetSchema) {}
