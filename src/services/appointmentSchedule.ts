const TIME_ZONE = 'Asia/Colombo';
const SLOT_MINUTES = 15;

export interface TimeRange {
  start: number;
  end: number;
}

export interface DoctorSchedule {
  availableDays?: unknown;
  consultingDays?: unknown;
  consultingStartDate?: unknown;
  consultingSlots?: unknown;
}

export interface AppointmentDateOption {
  fullDate: string;
  dayName: string;
  label: string;
  available: boolean;
}

export interface BookedAppointmentTime {
  timeSlot: string;
  endTime: string;
}

function getDateParts(date: Date, timeZone: string): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
}

export function getSriLankaDateTime(now = new Date()): {
  date: string;
  minuteOfDay: number;
} {
  const parts = getDateParts(now, TIME_ZONE);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function formatAppointmentDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split('-').map(Number);
  const dateObject = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    dateObject.getUTCFullYear() !== year
    || dateObject.getUTCMonth() !== month - 1
    || dateObject.getUTCDate() !== day
  ) {
    return date;
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateObject);
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function getDoctorDays(schedule: DoctorSchedule): string[] | null {
  const rawDays = schedule.availableDays ?? schedule.consultingDays;
  if (!Array.isArray(rawDays) || rawDays.length === 0) return null;

  const validDays = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const days = rawDays.map((day) =>
    typeof day === 'string' ? day.trim().slice(0, 3).toLowerCase() : ''
  );

  if (days.some((day) => !validDays.has(day))) return null;
  return days;
}

function getWeekday(date: string): string | null {
  if (!isValidDateString(date)) return null;
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
  }).format(new Date(`${date}T12:00:00Z`));
  return weekday.slice(0, 3).toLowerCase();
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return [
    result.getUTCFullYear(),
    String(result.getUTCMonth() + 1).padStart(2, '0'),
    String(result.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function getAppointmentDates(
  schedule: DoctorSchedule | null,
  now = new Date(),
  count = 7
): AppointmentDateOption[] {
  const today = getSriLankaDateTime(now).date;
  const days = schedule ? getDoctorDays(schedule) : null;
  const startDate = schedule?.consultingStartDate;
  const earliestDate = isValidDateString(startDate) ? startDate : null;
  const hasInvalidStartDate = startDate !== undefined
    && startDate !== null
    && earliestDate === null;
  const dates: AppointmentDateOption[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const fullDate = addDays(today, offset);
    const date = new Date(`${fullDate}T12:00:00Z`);
    const dayName = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
    }).format(date);
    const label = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
    }).format(date);

    dates.push({
      fullDate,
      dayName,
      label,
      available: !!days
        && !hasInvalidStartDate
        && (earliestDate === null || fullDate >= earliestDate)
        && days.includes(dayName.slice(0, 3).toLowerCase()),
    });
  }

  return dates;
}

export function getDoctorScheduleError(schedule: DoctorSchedule | null): string | null {
  if (!schedule) return 'Doctor schedule is unavailable.';
  if (!getDoctorDays(schedule)) {
    return 'This doctor does not have a valid weekly schedule yet.';
  }
  if (
    schedule.consultingStartDate !== undefined
    && schedule.consultingStartDate !== null
    && !isValidDateString(schedule.consultingStartDate)
  ) {
    return "The doctor's consultation start date is not available.";
  }
  if (!getDoctorRanges(schedule)) {
    return "The doctor's consultation hours are not available.";
  }
  return null;
}

function parseClock(value: string): number | null {
  const twelveHour = value.trim().match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    if (hour < 1 || hour > 12) return null;
    return (hour % 12 + (twelveHour[3].toUpperCase() === 'PM' ? 12 : 0)) * 60
      + Number(twelveHour[2]);
  }

  const twentyFourHour = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!twentyFourHour) return null;
  return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
}

export function parseTimeRange(value: unknown): TimeRange | null {
  if (typeof value !== 'string') return null;
  const parts = value.trim().split(/\s*[-–]\s*/);
  if (parts.length !== 2) return null;

  const start = parseClock(parts[0]);
  const end = parseClock(parts[1]);
  if (start === null || end === null || end <= start) return null;
  return { start, end };
}

function getDoctorRanges(schedule: DoctorSchedule): TimeRange[] | null {
  if (!Array.isArray(schedule.consultingSlots) || schedule.consultingSlots.length === 0) {
    return null;
  }
  const ranges = schedule.consultingSlots.map(parseTimeRange);
  const validRanges = ranges.filter((range): range is TimeRange => range !== null);
  return validRanges.length === ranges.length ? validRanges : null;
}

export function getSessionOverlap(
  session: unknown,
  schedule: DoctorSchedule | null
): TimeRange[] {
  const sessionRange = parseTimeRange(session);
  const doctorRanges = schedule ? getDoctorRanges(schedule) : null;
  if (!sessionRange || !doctorRanges) return [];

  return doctorRanges
    .map((range) => ({
      start: Math.max(sessionRange.start, range.start),
      end: Math.min(sessionRange.end, range.end),
    }))
    .filter((range) => range.start < range.end);
}

export function formatTimeSlot(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const displayHour = hour % 12 || 12;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

export function parseTimeSlot(value: unknown): number | null {
  return typeof value === 'string' ? parseClock(value) : null;
}

export function getNextAvailableAppointmentTime(
  slots: string[],
  bookedAppointments: BookedAppointmentTime[]
): string | null {
  const bookedRanges: TimeRange[] = [];
  for (const { timeSlot, endTime } of bookedAppointments) {
    const start = parseTimeSlot(timeSlot);
    const end = parseTimeSlot(endTime);
    if (start === null || end === null || end <= start) return null;
    bookedRanges.push({ start, end });
  }

  return slots.find((slot) => {
    const start = parseTimeSlot(slot);
    if (start === null) return false;
    const end = start + SLOT_MINUTES;
    return !bookedRanges.some((booked) => start < booked.end && end > booked.start);
  }) || null;
}

export function generateAppointmentSlots(
  overlaps: TimeRange[],
  date: string,
  now = new Date()
): string[] {
  const sriLankaNow = getSriLankaDateTime(now);
  const slots = new Set<string>();

  overlaps.forEach((range) => {
    for (let start = range.start; start + SLOT_MINUTES <= range.end; start += SLOT_MINUTES) {
      if (date === sriLankaNow.date && start <= sriLankaNow.minuteOfDay) continue;
      slots.add(formatTimeSlot(start));
    }
  });

  return [...slots].sort(
    (first, second) => (parseTimeSlot(first) ?? 0) - (parseTimeSlot(second) ?? 0)
  );
}

export function isAppointmentDateAllowed(
  schedule: DoctorSchedule,
  date: string,
  now = new Date()
): boolean {
  const today = getSriLankaDateTime(now).date;
  if (!isValidDateString(date) || date < today || getDoctorScheduleError(schedule)) return false;
  const days = getDoctorDays(schedule);
  const consultingStartDate = schedule.consultingStartDate;
  return !!days
    && (
      consultingStartDate === undefined
      || consultingStartDate === null
      || (isValidDateString(consultingStartDate) && date >= consultingStartDate)
    )
    && days.includes(getWeekday(date) || '');
}

export function isSlotInsideSchedule(
  schedule: DoctorSchedule,
  session: unknown,
  date: string,
  timeSlot: unknown,
  now = new Date()
): boolean {
  if (!isAppointmentDateAllowed(schedule, date, now)) return false;
  const slotStart = parseTimeSlot(timeSlot);
  if (slotStart === null) return false;

  return getSessionOverlap(session, schedule).some((range) =>
    slotStart >= range.start
    && slotStart + SLOT_MINUTES <= range.end
    && !(date === getSriLankaDateTime(now).date
      && slotStart <= getSriLankaDateTime(now).minuteOfDay)
  );
}
