import { IWidgetFilter, ProcessedResponse } from '../types/widget.types';

export function getFieldValue(
  response: ProcessedResponse,
  fieldId?: string,
  systemField?: string,
  formDesign?: any,
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

    // Normalize responses shape (may be JSON string, array of sections, or object with sections)
    let rr: any = response.responses;
    if (typeof rr === 'string') {
      try {
        rr = JSON.parse(rr);
      } catch (_e) {
        // leave as string if not JSON
      }
    }

    // Case 1: responses is already an array of sections
    if (Array.isArray(rr)) {
      for (const section of rr) {
        const sectionResponses = section?.responses;
        if (Array.isArray(sectionResponses)) {
          for (const questionResponse of sectionResponses) {
            if (questionResponse?.questionId === fieldId) {
              rawValue = questionResponse.response;
              break;
            }
          }
        }
        if (rawValue !== null && rawValue !== undefined) break;
      }
    }

    // Case 2: responses is an object with a 'sections' array
    if ((rawValue === null || rawValue === undefined) && rr && Array.isArray(rr.sections)) {
      for (const section of rr.sections) {
        const sectionResponses = section?.responses;
        if (Array.isArray(sectionResponses)) {
          for (const questionResponse of sectionResponses) {
            if (questionResponse?.questionId === fieldId) {
              rawValue = questionResponse.response;
              break;
            }
          }
        }
        if (rawValue !== null && rawValue !== undefined) break;
      }
    }

    // Case 3: responses may be an object keyed by fieldId
    if (rawValue === null || rawValue === undefined) {
      if (rr && typeof rr === 'object') {
        rawValue = rr[fieldId] ?? null;
      }
    }

    if (rawValue === null || rawValue === undefined) {
      // Optional debug visibility for Crosstab diagnosis
      const DBG = true;
      if (DBG) {
        try {
          const seen = new Set<string>();
          const collectIds = (node: any, depth = 0) => {
            if (!node || depth > 5) return;
            if (Array.isArray(node)) {
              for (const item of node) collectIds(item, depth + 1);
              return;
            }
            if (typeof node === 'object') {
              // Common shapes
              if (Array.isArray((node as any).responses)) {
                for (const qr of (node as any).responses) {
                  const qid = qr?.questionId ?? qr?.id;
                  if (qid) seen.add(String(qid));
                }
              }
              for (const k of Object.keys(node)) {
                if (k === 'responses') continue;
                // If an object is keyed by field id, catch that too
                if (k === String(fieldId)) {
                  seen.add(k);
                }
                collectIds(node[k], depth + 1);
              }
            }
          };
          collectIds(rr);
          console.log(
            'getFieldValue: could not resolve fieldId',
            fieldId,
            'systemField',
            systemField,
            'formId',
            response.formId,
            'availableIds(sample):',
            Array.from(seen).slice(0, 25),
          );
        } catch (_e) {
          // ignore debug errors
        }
      }
      return null;
    }

    const question = formDesign ? getQuestion(formDesign, fieldId) : null;
    const questionType = question?.type;
    if (!questionType) return rawValue;

    switch (questionType) {
      case 'Paragraph':
        try {
          const parsed =
            typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
          if (parsed && Array.isArray(parsed.blocks)) {
            return parsed.blocks.map((block: any) => block.text).join('\n');
          }
        } catch (e) {
          /* fallthrough */
        }
        return rawValue;
      case 'Phone Number':
        if (
          typeof rawValue === 'string' &&
          rawValue.length > 0 &&
          !rawValue.startsWith('+')
        ) {
          return `+${rawValue}`;
        }
        return rawValue;
      case 'Checkbox':
        if (Array.isArray(rawValue)) {
          return rawValue.filter((opt) => opt.checked).map((opt) => opt.option);
        }
        return rawValue;
      case 'Date':
        return rawValue?.date;
      case 'DateTime':
        return rawValue?.date && rawValue?.time
          ? `${rawValue.date}T${rawValue.time}:00`
          : rawValue;
      case 'DateRange':
        if (rawValue?.start && rawValue?.end) {
          try {
            const diff = Math.ceil(
              Math.abs(
                new Date(rawValue.end).getTime() -
                  new Date(rawValue.start).getTime(),
              ) /
                (1000 * 60 * 60 * 24),
            );
            return diff;
          } catch (e) {
            return 0;
          }
        }
        return rawValue;
      case 'From Database':
        if (Array.isArray(rawValue)) {
          return rawValue.map((item) => item.response);
        }
        return rawValue;
      default:
        return rawValue;
    }
  }
  return null;
}

export function getQuestion(formDesign: any, fieldId: string): any | null {
  if (!formDesign) return null;

  // Preferred shape: { sections: [...] }
  if (Array.isArray((formDesign as any).sections)) {
    for (const section of (formDesign as any).sections) {
      if (section?.questions && Array.isArray(section.questions)) {
        const question = section.questions.find((q: any) => q.id === fieldId);
        if (question) return question;
      }
    }
    return null;
  }

  // Legacy shape: formDesign is already an array of sections
  if (Array.isArray(formDesign)) {
    for (const section of formDesign) {
      if (section?.questions && Array.isArray(section.questions)) {
        const question = section.questions.find((q: any) => q.id === fieldId);
        if (question) return question;
      }
    }
    return null;
  }

  return null;
}

export async function applyFilters(
  responses: ProcessedResponse[],
  filters: IWidgetFilter[],
  formDesignsMap: Map<string, any>,
): Promise<ProcessedResponse[]> {
  if (!filters || filters.length === 0) return responses;
  return responses.filter((response) => {
    for (const filter of filters) {
      const formDesign = formDesignsMap.get(response.formId);
      const value = getFieldValue(
        response,
        filter.fieldId,
        filter.systemField,
        formDesign,
      );
      if (!applyFilterCondition(value, filter)) return false;
    }
    return true;
  });
}

function applyFilterCondition(value: any, filter: IWidgetFilter): boolean {
  const operator = filter.operator;
  const filterValue = filter.value;

  if (operator === 'is_null' || operator === 'is_empty') {
    if (Array.isArray(value)) return value.length === 0;
    return value === null || value === undefined || value === '';
  }
  if (operator === 'is_not_null' || operator === 'is_not_empty') {
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== '';
  }

  if (value === null || value === undefined) {
    return false;
  }

  const valueIsArray = Array.isArray(value);
  const fvIsArray = Array.isArray(filterValue);

  switch (operator) {
    case 'eq':
    case 'equals': {
      if (valueIsArray) {
        if (fvIsArray) {
          const set = new Set(
            (value as any[]).map((v) => normalizeScalarForCompare(v)),
          );
          return (filterValue as any[]).some((f: any) =>
            set.has(normalizeScalarForCompare(f)),
          );
        } else {
          return (value as any[]).some(
            (v) =>
              normalizeScalarForCompare(v) ===
              normalizeScalarForCompare(filterValue),
          );
        }
      } else {
        const numVal = toNumber(value);
        const numF = toNumber(filterValue);
        if (numVal !== null && numF !== null) return numVal === numF;
        return (
          normalizeScalarForCompare(value) ===
          normalizeScalarForCompare(filterValue)
        );
      }
    }
    case 'neq':
    case 'not_equals': {
      if (valueIsArray) {
        if (fvIsArray) {
          const set = new Set(
            (value as any[]).map((v) => normalizeScalarForCompare(v)),
          );
          return !(filterValue as any[]).some((f: any) =>
            set.has(normalizeScalarForCompare(f)),
          );
        } else {
          return !(value as any[]).some(
            (v) =>
              normalizeScalarForCompare(v) ===
              normalizeScalarForCompare(filterValue),
          );
        }
      } else {
        const numVal = toNumber(value);
        const numF = toNumber(filterValue);
        if (numVal !== null && numF !== null) return numVal !== numF;
        return (
          normalizeScalarForCompare(value) !==
          normalizeScalarForCompare(filterValue)
        );
      }
    }
    case 'gt':
    case 'greater_than': {
      const v = toNumber(value);
      const f = toNumber(filterValue);
      return v !== null && f !== null && v > f;
    }
    case 'gte':
    case 'greater_than_equal': {
      const v = toNumber(value);
      const f = toNumber(filterValue);
      return v !== null && f !== null && v >= f;
    }
    case 'lt':
    case 'less_than': {
      const v = toNumber(value);
      const f = toNumber(filterValue);
      return v !== null && f !== null && v < f;
    }
    case 'lte':
    case 'less_than_equal': {
      const v = toNumber(value);
      const f = toNumber(filterValue);
      return v !== null && f !== null && v <= f;
    }
    case 'contains': {
      const needle = String(filterValue).toLowerCase();
      if (valueIsArray) {
        return (value as any[]).some((v) =>
          String(v).toLowerCase().includes(needle),
        );
      }
      return String(value).toLowerCase().includes(needle);
    }
    case 'starts_with': {
      const needle = String(filterValue).toLowerCase();
      if (valueIsArray) {
        return (value as any[]).some((v) =>
          String(v).toLowerCase().startsWith(needle),
        );
      }
      return String(value).toLowerCase().startsWith(needle);
    }
    case 'ends_with': {
      const needle = String(filterValue).toLowerCase();
      if (valueIsArray) {
        return (value as any[]).some((v) =>
          String(v).toLowerCase().endsWith(needle),
        );
      }
      return String(value).toLowerCase().endsWith(needle);
    }
    case 'in': {
      if (!Array.isArray(filterValue)) return false;
      const set = new Set(
        (filterValue as any[]).map((f) => normalizeScalarForCompare(f)),
      );
      if (valueIsArray) {
        return (value as any[]).some((v) =>
          set.has(normalizeScalarForCompare(v)),
        );
      } else {
        return set.has(normalizeScalarForCompare(value));
      }
    }
    case 'not_in': {
      if (!Array.isArray(filterValue)) return true;
      const set = new Set(
        (filterValue as any[]).map((f) => normalizeScalarForCompare(f)),
      );
      if (valueIsArray) {
        return !(value as any[]).some((v) =>
          set.has(normalizeScalarForCompare(v)),
        );
      } else {
        return !set.has(normalizeScalarForCompare(value));
      }
    }
    case 'date_eq': {
      const dv = toDate(value);
      const df = toDate(filterValue);
      return dv !== null && df !== null && isSameDay(dv, df);
    }
    case 'date_before': {
      const dv = toDate(value);
      const df = toDate(filterValue);
      return dv !== null && df !== null && dv < df;
    }
    case 'date_after': {
      const dv = toDate(value);
      const df = toDate(filterValue);
      return dv !== null && df !== null && dv > df;
    }
    case 'date_range': {
      if (
        filterValue &&
        typeof filterValue === 'object' &&
        filterValue.from &&
        filterValue.to
      ) {
        const dv = toDate(value);
        const fromDate = toDate(filterValue.from);
        const toDateVal = toDate(filterValue.to);
        if (!dv || !fromDate || !toDateVal) return false;
        return dv >= fromDate && dv <= toDateVal;
      }
      return false;
    }
    case 'is_true':
      return String(value).toLowerCase() === 'true' || value === true;
    case 'is_false':
      return String(value).toLowerCase() === 'false' || value === false;
    default:
      console.warn(`Unknown filter operator: ${operator}`);
      return true;
  }
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

function normalizeScalarForCompare(x: any): string {
  if (x === null || x === undefined) return '';
  if (x instanceof Date) return x.toISOString();
  if (typeof x === 'boolean') return x ? 'true' : 'false';
  if (typeof x === 'number') return x.toString();
  return String(x).trim().toLowerCase();
}

function toNumber(x: any): number | null {
  if (x === null || x === undefined) return null;
  if (x instanceof Date) return x.getTime();
  const n = typeof x === 'number' ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : null;
}

function toDate(x: any): Date | null {
  if (!x && x !== 0) return null;
  if (x instanceof Date) return x;
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}
