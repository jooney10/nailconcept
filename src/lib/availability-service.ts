import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { computeAvailability, type DayAvailability } from "@/lib/availability";

export interface AvailabilityQuery {
  serviceId: string;
  technicianId?: string; // omit or "any" for no preference
}

export interface AvailabilityResult {
  service: { id: string; name: string; durationMin: number };
  technicianOptions: { id: string; name: string }[];
  days: DayAvailability[];
}

/**
 * Load everything the engine needs and compute availability for a service,
 * optionally constrained to a single technician.
 */
export async function getAvailability(
  query: AvailabilityQuery,
): Promise<AvailabilityResult | null> {
  const service = await prisma.service.findFirst({
    where: { id: query.serviceId, active: true },
  });
  if (!service) return null;

  const business = await getBusiness();
  const wantTech =
    query.technicianId && query.technicianId !== "any"
      ? query.technicianId
      : null;

  // Technicians who are active and offer this service (and match the filter).
  const technicians = await prisma.technician.findMany({
    where: {
      active: true,
      services: { some: { id: service.id } },
      ...(wantTech ? { id: wantTech } : {}),
    },
    orderBy: { displayOrder: "asc" },
    include: { workingHours: true },
  });

  if (technicians.length === 0) {
    return {
      service: { id: service.id, name: service.name, durationMin: service.durationMin },
      technicianOptions: [],
      days: [],
    };
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + business.maxAdvanceDays * 86_400_000);
  const techIds = technicians.map((t) => t.id);

  // Future bookings + time-off for the relevant technicians, in one query each.
  const [bookings, timeOff] = await Promise.all([
    prisma.booking.findMany({
      where: {
        technicianId: { in: techIds },
        status: "CONFIRMED",
        endAt: { gte: now },
        startAt: { lte: horizon },
      },
      select: {
        technicianId: true,
        startAt: true,
        endAt: true,
        bufferBeforeMin: true,
        bufferAfterMin: true,
      },
    }),
    prisma.timeOff.findMany({
      where: {
        technicianId: { in: techIds },
        endAt: { gte: now },
        startAt: { lte: horizon },
      },
      select: { technicianId: true, startAt: true, endAt: true },
    }),
  ]);

  const days = computeAvailability({
    now,
    rules: {
      timezone: business.timezone,
      slotIntervalMin: business.slotIntervalMin,
      bufferBeforeMin: business.bufferBeforeMin,
      bufferAfterMin: business.bufferAfterMin,
      minNoticeHours: business.minNoticeHours,
      maxAdvanceDays: business.maxAdvanceDays,
    },
    serviceDurationMin: service.durationMin,
    technicians: technicians.map((t) => ({
      technicianId: t.id,
      workingHours: t.workingHours.map((w) => ({
        weekday: w.weekday,
        startMinute: w.startMinute,
        endMinute: w.endMinute,
      })),
      bookings: bookings
        .filter((b) => b.technicianId === t.id)
        .map((b) => ({
          startAt: b.startAt,
          endAt: b.endAt,
          bufferBeforeMin: b.bufferBeforeMin,
          bufferAfterMin: b.bufferAfterMin,
        })),
      timeOff: timeOff
        .filter((o) => o.technicianId === t.id)
        .map((o) => ({ startAt: o.startAt, endAt: o.endAt })),
    })),
  });

  return {
    service: { id: service.id, name: service.name, durationMin: service.durationMin },
    technicianOptions: technicians.map((t) => ({ id: t.id, name: t.name })),
    days,
  };
}
