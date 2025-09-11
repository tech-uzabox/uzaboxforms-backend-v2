import { ProcessedResponse } from '../types/widget.types';

export function calculateAggregation(
  responses: ProcessedResponse[],
  aggregationType: string,
  fieldId: string | undefined,
  systemField: string | undefined,
  formDesign: any
): number {
  if (responses.length === 0) {
    return 0;
  }

  if (aggregationType === "count") {
    return responses.length;
  }

  const values: number[] = [];
  for (const response of responses) {
    const value = getFieldValue(response, fieldId, systemField, formDesign);
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) {
          const numValue = toNumber(v);
          if (numValue !== null) values.push(numValue);
        }
      } else {
        const numValue = toNumber(value);
        if (numValue !== null) {
          values.push(numValue);
        }
      }
    }
  }

  if (values.length === 0) {
    return 0;
  }

  switch (aggregationType) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "mean":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "median": {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }
    case "mode": {
      const frequency: { [key: number]: number } = {};
      values.forEach(val => {
        frequency[val] = (frequency[val] || 0) + 1;
      });
      let maxFreq = 0;
      let mode = values[0];
      for (const [val, freq] of Object.entries(frequency)) {
        if (freq > maxFreq) {
          maxFreq = freq;
          mode = parseFloat(val);
        }
      }
      return mode;
    }
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "std": {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
      return Math.sqrt(variance);
    }
    case "variance": {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
      return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }
    case "p10": {
      const sorted = [...values].sort((a, b) => a - b);
      const index = Math.floor(sorted.length * 0.1);
      return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    }
    case "p25": {
      const sorted = [...values].sort((a, b) => a - b);
      const index = Math.floor(sorted.length * 0.25);
      return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    }
    case "p50": {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }
    case "p75": {
      const sorted = [...values].sort((a, b) => a - b);
      const index = Math.floor(sorted.length * 0.75);
      return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    }
    case "p90": {
      const sorted = [...values].sort((a, b) => a - b);
      const index = Math.floor(sorted.length * 0.9);
      return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    }
    default:
      console.warn(`Unknown aggregation type: ${aggregationType}`);
      return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

function getFieldValue(
  response: ProcessedResponse,
  fieldId?: string,
  systemField?: string,
  formDesign?: any
): any {
  if (systemField) {
    switch (systemField) {
      case "responseId":
        return response._id;
      case "submissionDate":
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
    if (rawValue === null || rawValue === undefined) return null;

    const question = formDesign ? getQuestion(formDesign, fieldId) : null;
    const questionType = question?.type;
    if (!questionType) return rawValue;

    switch (questionType) {
      case "Paragraph":
        try {
          const parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
          if (parsed && Array.isArray(parsed.blocks)) {
            return parsed.blocks.map((block: any) => block.text).join("\n");
          }
        } catch (e) {
          /* fallthrough */
        }
        return rawValue;
      case "Phone Number":
        if (typeof rawValue === "string" && rawValue.length > 0 && !rawValue.startsWith("+")) {
          return `+${rawValue}`;
        }
        return rawValue;
      case "Checkbox":
        if (Array.isArray(rawValue)) {
          return rawValue.filter((opt) => opt.checked).map((opt) => opt.option);
        }
        return rawValue;
      case "Date":
        return rawValue?.date;
      case "DateTime":
        return rawValue?.date && rawValue?.time ? `${rawValue.date}T${rawValue.time}:00` : rawValue;
      case "DateRange":
        if (rawValue?.start && rawValue?.end) {
          try {
            const diff = Math.ceil(Math.abs(new Date(rawValue.end).getTime() - new Date(rawValue.start).getTime()) / (1000 * 60 * 60 * 24));
            return diff;
          } catch (e) {
            return 0;
          }
        }
        return rawValue;
      case "From Database":
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

function getQuestion(formDesign: any, fieldId: string): any | null {
  if (!formDesign || !formDesign.sections || !Array.isArray(formDesign.sections)) return null;
  for (const section of formDesign.sections) {
    if (section.questions && Array.isArray(section.questions)) {
      const question = section.questions.find((q: any) => q.id === fieldId);
      if (question) return question;
    }
  }
  return null;
}

function toNumber(x: any): number | null {
  if (x === null || x === undefined) return null;
  if (x instanceof Date) return x.getTime();
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : null;
}
