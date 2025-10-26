import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  group: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // North America
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: '-05:00/-04:00', group: 'North America' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: '-06:00/-05:00', group: 'North America' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: '-07:00/-06:00', group: 'North America' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: '-08:00/-07:00', group: 'North America' },
  { value: 'America/Toronto', label: 'Toronto', offset: '-05:00/-04:00', group: 'North America' },
  { value: 'America/Vancouver', label: 'Vancouver', offset: '-08:00/-07:00', group: 'North America' },
  { value: 'America/Mexico_City', label: 'Mexico City', offset: '-06:00/-05:00', group: 'North America' },

  // Europe
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: '+00:00/+01:00', group: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', offset: '+01:00/+02:00', group: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', offset: '+01:00/+02:00', group: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)', offset: '+01:00/+02:00', group: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)', offset: '+01:00/+02:00', group: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)', offset: '+01:00/+02:00', group: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)', offset: '+01:00/+02:00', group: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)', offset: '+03:00', group: 'Europe' },

  // Asia
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00', group: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: '+08:00', group: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: '+08:00', group: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00', group: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', offset: '+09:00', group: 'Asia' },
  { value: 'Asia/Kolkata', label: 'Mumbai/Delhi (IST)', offset: '+05:30', group: 'Asia' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00', group: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', offset: '+07:00', group: 'Asia' },

  // Africa
  { value: 'Africa/Cairo', label: 'Cairo (EET)', offset: '+02:00', group: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)', offset: '+02:00', group: 'Africa' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)', offset: '+01:00', group: 'Africa' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)', offset: '+03:00', group: 'Africa' },
  { value: 'Africa/Kigali', label: 'Kigali (CAT)', offset: '+02:00', group: 'Africa' },

  // Australia/Oceania
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', offset: '+10:00/+11:00', group: 'Australia/Oceania' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)', offset: '+10:00/+11:00', group: 'Australia/Oceania' },
  { value: 'Australia/Perth', label: 'Perth (AWST)', offset: '+08:00', group: 'Australia/Oceania' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)', offset: '+12:00/+13:00', group: 'Australia/Oceania' },

  // South America
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)', offset: '-03:00', group: 'South America' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)', offset: '-03:00', group: 'South America' },
  { value: 'America/Lima', label: 'Lima (PET)', offset: '-05:00', group: 'South America' },

  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00', group: 'UTC' },
];

export function getTimezoneOptionsByGroup(): Record<string, TimezoneOption[]> {
  return TIMEZONE_OPTIONS.reduce((groups, option) => {
    if (!groups[option.group]) {
      groups[option.group] = [];
    }
    groups[option.group].push(option);
    return groups;
  }, {} as Record<string, TimezoneOption[]>);
}

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function formatInTimezone(
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const zonedDate = toZonedTime(date, timezone);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      ...options,
    }).format(zonedDate);
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      ...options,
    }).format(date);
  }
}

export function convertToTimezone(date: Date, timezone: string): Date {
  try {
    return toZonedTime(date, timezone);
  } catch (error) {
    return date;
  }
}

export function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const zoned = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    return (zoned.getTime() - utc.getTime()) / (1000 * 60);
  } catch {
    return 0;
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function getTimezoneDisplayName(timezone: string): string {
  const option = TIMEZONE_OPTIONS.find(opt => opt.value === timezone);
  return option ? option.label : timezone;
}

export function parseDateInTimezone(dateString: string, timezone: string): Date {
  try {
    // Parse the date string and convert to UTC
    const parsedDate = parseISO(dateString);
    return fromZonedTime(parsedDate, timezone);
  } catch (error) {
    // Fallback to regular parsing
    return new Date(dateString);
  }
}

export function formatDateForStorage(date: Date, timezone?: string): string {
  if (!timezone) {
    return date.toISOString();
  }
  
  try {
    // Convert to the specified timezone and then to UTC for storage
    const zonedDate = toZonedTime(date, timezone);
    return zonedDate.toISOString();
  } catch (error) {
    return date.toISOString();
  }
}

export function parseStoredDate(dateString: string, timezone?: string): Date {
  const date = new Date(dateString);
  
  if (!timezone) {
    return date;
  }
  
  try {
    // Convert from UTC to the specified timezone
    return toZonedTime(date, timezone);
  } catch (error) {
    return date;
  }
}

export function formatDateForDisplay(
  date: Date | string,
  timezone?: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!timezone) {
    return format(dateObj, 'MMM dd, yyyy');
  }
  
  try {
    return formatInTimezone(dateObj, timezone, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    });
  } catch (error) {
    return format(dateObj, 'MMM dd, yyyy');
  }
}

export function formatDateTimeForDisplay(
  date: Date | string,
  timezone?: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!timezone) {
    return format(dateObj, 'MMM dd, yyyy HH:mm');
  }
  
  try {
    return formatInTimezone(dateObj, timezone, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    });
  } catch (error) {
    return format(dateObj, 'MMM dd, yyyy HH:mm');
  }
}
