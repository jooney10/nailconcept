import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/booking-service";
import { formatAppointment } from "@/lib/datetime";
import { getBusiness } from "@/lib/business";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  serviceId: z.string().min(1),
  technicianId: z.string().optional(),
  startIso: z.string().min(1),
  customerName: z.string().min(2, "Please enter your name.").max(80),
  customerPhone: z
    .string()
    .min(7, "Please enter a valid phone number.")
    .max(20),
  customerEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid details.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const result = await createBooking(parsed.data);
  if (!result.ok) {
    const status = result.code === "SLOT_TAKEN" ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const business = await getBusiness();
  return NextResponse.json({
    reference: result.booking.reference,
    serviceName: result.booking.serviceName,
    technicianName: result.booking.technicianName,
    startAt: result.booking.startAt.toISOString(),
    when: formatAppointment(result.booking.startAt, business.timezone),
  });
}
