import {
  GroupedData,
  IWidgetGroupBy,
  ProcessedResponse,
} from '../types/widget.types';

export async function groupResponses(
  responses: ProcessedResponse[],
  groupBy: IWidgetGroupBy,
): Promise<GroupedData> {
  const groupedData: GroupedData = {};

  for (const response of responses) {
    let groupKey: string;

    if (!groupBy || groupBy.kind === 'none') {
      groupKey = 'all';
    } else {
      const groupValue = getFieldValue(
        response,
        groupBy.fieldId,
        groupBy.systemField,
      );

      if (groupValue === null || groupValue === undefined) {
        if (groupBy.includeMissing) {
          groupKey = 'missing';
        } else {
          continue;
        }
      } else {
        if (groupBy.kind === 'time' && groupBy.timeBucket) {
          const dt = toDate(groupValue);
          if (!dt) {
            if (groupBy.includeMissing) {
              groupKey = 'missing';
            } else {
              continue;
            }
          } else {
            const { key, sortValue } = formatTimeValue(dt, groupBy.timeBucket);
            groupKey = key;
            if (!groupedData[groupKey]) {
              groupedData[groupKey] = {
                responses: [],
                metrics: {},
                sortValue,
              };
            }
          }
        } else {
          groupKey = String(groupValue);
        }
      }
    }

    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        responses: [],
        metrics: {},
      };
    }

    groupedData[groupKey].responses.push(response);
  }

  return groupedData;
}

export function computeSortedGroupKeys(
  groupKeys: string[],
  groupedData: GroupedData,
  sort: any,
  groupBy: IWidgetGroupBy,
  aggMatrix: Record<string, Record<string, number>>,
  primaryMetricId?: string,
): string[] {
  if (!sort || sort.by === 'none') {
    return groupKeys;
  }

  const sortBy = sort.by;
  const sortOrder = sort.order || 'asc';

  return groupKeys.sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
      case 'alpha':
        aValue = a;
        bValue = b;
        break;
      case 'time':
        if (groupBy.kind === 'time') {
          aValue = groupedData[a]?.sortValue || 0;
          bValue = groupedData[b]?.sortValue || 0;
        } else {
          aValue = a;
          bValue = b;
        }
        break;
      case 'value':
        if (primaryMetricId && aggMatrix[a] && aggMatrix[b]) {
          aValue = aggMatrix[a][primaryMetricId] || 0;
          bValue = aggMatrix[b][primaryMetricId] || 0;
        } else {
          aValue = groupedData[a]?.responses?.length || 0;
          bValue = groupedData[b]?.responses?.length || 0;
        }
        break;
      default:
        aValue = a;
        bValue = b;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'desc' ? -comparison : comparison;
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    }

    // Fallback to string comparison
    const aStr = String(aValue);
    const bStr = String(bValue);
    const comparison = aStr.localeCompare(bStr);
    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

function getFieldValue(
  response: ProcessedResponse,
  fieldId?: string,
  systemField?: string,
): any {
  if (systemField) {
    switch (systemField) {
      case 'responseId':
        return response.id;
      case 'submissionDate':
        return response.createdAt;
      default:
        return null;
    }
  }

  if (fieldId && response.responses) {
    let rawValue: any = null;
    if (Array.isArray(response.responses)) {
      for (const section of response.responses) {
        if (section.responses && Array.isArray(section.responses)) {
          for (const questionResponse of section.responses) {
            if (questionResponse.questionId === fieldId) {
              rawValue = questionResponse.response;
              break;
            }
          }
        }
        if (rawValue) break;
      }
    }
    if (rawValue === null) rawValue = response.responses[fieldId];
    return rawValue;
  }
  return null;
}

function toDate(x: any): Date | null {
  if (!x && x !== 0) return null;
  if (x instanceof Date) return x;
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}

function formatTimeValue(
  date: Date,
  timeBucket: string,
): { key: string; sortValue: number } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();

  switch (timeBucket) {
    case 'year':
      return { key: year.toString(), sortValue: year };
    case 'quarter':
      const quarter = Math.floor(month / 3) + 1;
      return { key: `${year}-Q${quarter}`, sortValue: year * 4 + quarter };
    case 'month':
      return {
        key: `${year}-${pad2(month + 1)}`,
        sortValue: year * 12 + month,
      };
    case 'week':
      const weekInfo = getISOWeekInfo(date);
      return {
        key: `${year}-W${pad2(weekInfo.week)}`,
        sortValue: year * 53 + weekInfo.week,
      };
    case 'day':
      return {
        key: `${year}-${pad2(month + 1)}-${pad2(day)}`,
        sortValue: date.getTime(),
      };
    case 'hour':
      return {
        key: `${year}-${pad2(month + 1)}-${pad2(day)} ${pad2(hour)}:00`,
        sortValue: date.getTime(),
      };
    case 'minute':
      return {
        key: `${year}-${pad2(month + 1)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}`,
        sortValue: date.getTime(),
      };
    case 'whole':
      return { key: date.toISOString(), sortValue: date.getTime() };
    default:
      return {
        key: date.toISOString().slice(0, 10),
        sortValue: date.getTime(),
      };
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function getISOWeekInfo(date: Date): { week: number; year: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { week: weekNo, year: d.getFullYear() };
}
