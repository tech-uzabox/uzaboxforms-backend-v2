import { ProcessedResponse } from '../types/widget.types';

export function normalizeResponses(responses: any[]): ProcessedResponse[] {
  return responses.map((r) => ({
    id: r.id,
    formId: r.formId,
    responses: r.responses,
    createdAt: r.createdAt,
    userId: r.applicantProcess?.applicantId,
    processId: r.applicantProcess?.processId,
    applicantProcessId: r.applicantProcessId,
  }));
}

export function getUniqueFormIds(config: any): string[] {
  const formIds = new Set<string>();

  // Metrics-based widgets
  if (config?.metrics && Array.isArray(config.metrics)) {
    for (const metric of config.metrics) {
      if (metric?.formId) formIds.add(String(metric.formId));
    }
  }

  // Legacy sources
  if (config?.sources && Array.isArray(config.sources)) {
    for (const source of config.sources) {
      if (source?.formId) formIds.add(String(source.formId));
    }
  }

  // Map metrics
  if (config?.options?.map?.metrics && Array.isArray(config.options.map.metrics)) {
    for (const m of config.options.map.metrics) {
      if (m?.formId) formIds.add(String(m.formId));
    }
  }

  // Crosstab widget: include row/column/value forms
  const cx = config?.options?.crosstab || config?.crosstab;
  if (cx) {
    if (cx.row?.formId) formIds.add(String(cx.row.formId));
    if (cx.column?.formId) formIds.add(String(cx.column.formId));
    if (cx.value?.formId) formIds.add(String(cx.value.formId));
  }

  return Array.from(formIds);
}

export function resolveDateRange(dateRange: any): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  let startDate: Date, endDate: Date;
  if (!dateRange || !dateRange.preset) {
    endDate = now;
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate, endDate };
  }
  if (dateRange.preset === 'custom') {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    to.setHours(23, 59, 59, 999);
    return { startDate: from, endDate: to };
  }
  endDate = now;
  switch (dateRange.preset) {
    case 'last-7-days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'last-30-days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'last-3-months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'last-6-months':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case 'last-12-months':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { startDate, endDate };
}
