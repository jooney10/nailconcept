import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { getAvailability } from "@/lib/availability-service";
import { generateReference } from "@/lib/reference";
import { sendBookingMessage } from "@/lib/messaging";

export interface CreateBookingInput {
  serviceId: string;
  technicianId?: string; // "any" or omitted = no preference
  startIso: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
}

export type CreateBookingResult =
  | {
      ok: true;
      booking: {
        reference: string;
        serviceName: string;
        technicianName: string;
        startAt: Date;
      };
    }
  | { ok: false; error: string; code: "SLOT_TAKEN" | "INVALID" | "NOT_FOUND" };

/** Normalise a UK phone number to E.164 digits (no +). Best-effort. */
export function normalizeUkPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("44")) return digits;
  if (digits.startsWith("0")) return "44" + digits.slice(1);
  return digits;
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const start = new Date(input.startIso);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: "Invalid start time.", code: "INVALID" };
  }

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, active: true },
  });
  if (!service) {
    return { ok: false, error: "That service is no longer available.", code: "NOT_FOUND" };
  }

  // Recompute availability server-side and confirm this exact slot is still open.
  const availability = await getAvailability({
    serviceId: input.serviceId,
    technicianId: input.technicianId,
  });
  if (!availability) {
    return { ok: false, error: "That service is no longer available.", code: "NOT_FOUND" };
  }

  const slot = availability.days
    .flatMap((d) => d.slots)
    .find((s) => s.iso === start.toISOString());

  if (!slot || slot.technicianIds.length === 0) {
    return {
      ok: false,
      error: "Sorry, that slot has just been taken. Please pick another time.",
      code: "SLOT_TAKEN",
    };
  }

  // Resolve which technician gets the booking (first free one for "any").
  const technicianId = slot.technicianIds[0];
  const business = await getBusiness();
  const endAt = new Date(start.getTime() + service.durationMin * 60_000);

  // Final guard against a race: inside a transaction, re-check for an overlapping
  // confirmed booking (footprint) for this technician, then create.
  const fpStart = new Date(start.getTime() - business.bufferBeforeMin * 60_000);
  const fpEnd = new Date(endAt.getTime() + business.bufferAfterMin * 60_000);

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const clash = await tx.booking.findFirst({
        where: {
          technicianId,
          status: "CONFIRMED",
          // overlap of [startAt,endAt] with footprint window is a good-enough
          // guard; buffers make this conservative.
          startAt: { lt: fpEnd },
          endAt: { gt: fpStart },
        },
      });
      if (clash) return null;

      return tx.booking.create({
        data: {
          reference: generateReference(),
          technicianId,
          serviceId: service.id,
          customerName: input.customerName.trim(),
          customerPhone: normalizeUkPhone(input.customerPhone),
          customerEmail: (input.customerEmail ?? "").trim(),
          notes: (input.notes ?? "").trim(),
          startAt: start,
          endAt,
          status: "CONFIRMED",
          bufferBeforeMin: business.bufferBeforeMin,
          bufferAfterMin: business.bufferAfterMin,
        },
        include: { service: true, technician: true },
      });
    });
  } catch {
    return { ok: false, error: "Something went wrong saving your booking.", code: "INVALID" };
  }

  if (!created) {
    return {
      ok: false,
      error: "Sorry, that slot has just been taken. Please pick another time.",
      code: "SLOT_TAKEN",
    };
  }

  // Fire the confirmation message (stub-logged until WhatsApp API is live).
  // Never let a messaging failure break the booking.
  try {
    await sendBookingMessage(created.id, "CONFIRMATION");
  } catch (err) {
    console.error("Confirmation message failed:", err);
  }

  return {
    ok: true,
    booking: {
      reference: created.reference,
      serviceName: created.service.name,
      technicianName: created.technician.name,
      startAt: created.startAt,
    },
  };
}
