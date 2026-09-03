import { fromZonedTime, toZonedTime } from "date-fns-tz";

// ---------------------------------------------------------------------------
// Availability engine
//
// Pure functions that turn working hours + existing bookings + time-off + the
// business rules into concrete bookable start times. All wall-clock reasoning
// happens in the business timezone; everything crossing the DB boundary is UTC.
//
// Buffer model (matches the brief: "15 mins either side"): every appointment
// reserves a FOOTPRINT of [start - bufferBefore, end + bufferAfter]. Two
// appointments are compatible only if their footprints don't overlap — so two
// back-to-back bookings naturally get bufferAfter + bufferBefore of breathing
// room between them. The treatment itself must fit inside a working block.
// ---------------------------------------------------------------------------

export interface BookingRules {
  timezone: string;
  slotIntervalMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
}

export interface WorkingBlock {
  weekday: number; // 0 = Sun .. 6 = Sat
  startMinute: number;
  endMinute: number;
}

export interface BusyBooking {
  startAt: Date;
  endAt: Date;
  bufferBeforeMin: number;
  bufferAfterMin: number;
}

export interface BusyTimeOff {
  startAt: Date;
  endAt: Date;
}

export interface TechnicianAvailabilityInput {
  technicianId: string;
  workingHours: WorkingBlock[];
  bookings: BusyBooking[];
  timeOff: BusyTimeOff[];
}

export interface Slot {
  time: string; // "09:00" (business-local, 24h)
  iso: string; // UTC ISO instant of the treatment start
  technicianIds: string[]; // techs free at this instant
}

export interface DayAvailability {
  date: string; // "2026-09-05" (business-local calendar date)
  label: string; // "Fri 5 Sep"
  slotCount: number;
  slots: Slot[];
}

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const pad = (n: number) => String(n).padStart(2, "0");

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Noon-UTC anchor Dates for each local calendar day, starting today (tz). */
function localCalendarDays(now: Date, tz: string, days: number): Date[] {
  const zoned = toZonedTime(now, tz);
  const base = new Date(
    Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate(), 12),
  );
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    return d;
  });
}

function dayLabel(anchor: Date): string {
  return `${WEEKDAY_ABBR[anchor.getUTCDay()]} ${anchor.getUTCDate()} ${
    MONTH_ABBR[anchor.getUTCMonth()]
  }`;
}

function dateString(anchor: Date): string {
  return `${anchor.getUTCFullYear()}-${pad(anchor.getUTCMonth() + 1)}-${pad(
    anchor.getUTCDate(),
  )}`;
}

/** UTC instant for a local wall-clock time on a given local date. */
function localToUtc(dateStr: string, minutes: number, tz: string): Date {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return fromZonedTime(`${dateStr}T${pad(hh)}:${pad(mm)}:00`, tz);
}

/**
 * Compute availability for one service across one or more technicians.
 * If multiple technicians are supplied, a slot is offered when ANY of them is
 * free, and the slot records which technicians can take it.
 */
export function computeAvailability(params: {
  now: Date;
  rules: BookingRules;
  serviceDurationMin: number;
  technicians: TechnicianAvailabilityInput[];
}): DayAvailability[] {
  const { now, rules, serviceDurationMin, technicians } = params;
  const {
    timezone,
    slotIntervalMin,
    bufferBeforeMin,
    bufferAfterMin,
    minNoticeHours,
    maxAdvanceDays,
  } = rules;

  const earliest = now.getTime() + minNoticeHours * 3600_000;
  const latest = now.getTime() + maxAdvanceDays * 86_400_000;
  const days = localCalendarDays(now, timezone, maxAdvanceDays + 1);

  const result: DayAvailability[] = [];

  for (const anchor of days) {
    const weekday = anchor.getUTCDay();
    const dateStr = dateString(anchor);
    // slotIso -> techIds that can take it (keeps slots sorted + deduped by time)
    const slotMap = new Map<string, { minutes: number; techIds: string[] }>();

    for (const tech of technicians) {
      const blocks = tech.workingHours.filter((b) => b.weekday === weekday);
      if (blocks.length === 0) continue;

      for (const block of blocks) {
        const lastStart = block.endMinute - serviceDurationMin;
        for (
          let minute = block.startMinute;
          minute <= lastStart;
          minute += slotIntervalMin
        ) {
          const start = localToUtc(dateStr, minute, timezone);
          const startMs = start.getTime();
          const endMs = startMs + serviceDurationMin * 60_000;

          // Notice / advance / past guards.
          if (startMs < earliest || startMs > latest) continue;

          // Candidate footprint (treatment + buffers).
          const fpStart = startMs - bufferBeforeMin * 60_000;
          const fpEnd = endMs + bufferAfterMin * 60_000;

          // Conflict with existing bookings (their footprints).
          const clashesBooking = tech.bookings.some((b) => {
            const bStart = b.startAt.getTime() - b.bufferBeforeMin * 60_000;
            const bEnd = b.endAt.getTime() + b.bufferAfterMin * 60_000;
            return overlaps(fpStart, fpEnd, bStart, bEnd);
          });
          if (clashesBooking) continue;

          // Conflict with time-off.
          const clashesTimeOff = tech.timeOff.some((t) =>
            overlaps(fpStart, fpEnd, t.startAt.getTime(), t.endAt.getTime()),
          );
          if (clashesTimeOff) continue;

          const iso = start.toISOString();
          const existing = slotMap.get(iso);
          if (existing) {
            existing.techIds.push(tech.technicianId);
          } else {
            slotMap.set(iso, { minutes: minute, techIds: [tech.technicianId] });
          }
        }
      }
    }

    if (slotMap.size === 0) continue;

    const slots: Slot[] = Array.from(slotMap.entries())
      .map(([iso, v]) => ({
        iso,
        time: `${pad(Math.floor(v.minutes / 60))}:${pad(v.minutes % 60)}`,
        technicianIds: v.techIds,
      }))
      .sort((a, b) => a.iso.localeCompare(b.iso));

    result.push({
      date: dateStr,
      label: dayLabel(anchor),
      slotCount: slots.length,
      slots,
    });
  }

  return result;
}
