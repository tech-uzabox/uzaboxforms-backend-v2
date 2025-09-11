import { ProcessedResponse } from '../types/widget.types';

export function normalizeResponses(responses: any[]): ProcessedResponse[] {
  return responses.map(r => ({
    _id: r.id,
    formId: r.formId,
    responses: r.responses,
    createdAt: r.createdAt,
    userId: r.applicantProcess?.applicantId,
    processId: r.applicantProcess?.processId,
    applicantProcessId: r.applicantProcessId
  }));
}

export function getUniqueFormIds(config: any): string[] {
  const formIds = new Set<string>();
  if (config.metrics && Array.isArray(config.metrics)) {
    config.metrics.forEach((metric: any) => {
      if (metric.formId) formIds.add(metric.formId);
    });
  }
  if (config.sources && Array.isArray(config.sources)) {
    config.sources.forEach((source: any) => {
      if (source.formId) formIds.add(source.formId);
    });
  }
  return Array.from(formIds);
}

export function resolveDateRange(dateRange: any): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date, endDate: Date;
  if (!dateRange || !dateRange.preset) {
    endDate = now;
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate, endDate };
  }
  if (dateRange.preset === "custom") {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    to.setHours(23, 59, 59, 999);
    return { startDate: from, endDate: to };
  }
  endDate = now;
  switch (dateRange.preset) {
    case "last-7-days":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last-30-days":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "last-3-months":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "last-6-months":
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case "last-12-months":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { startDate, endDate };
}
