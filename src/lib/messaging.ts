import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { formatAppointment } from "@/lib/datetime";
import { sendWhatsApp } from "@/lib/whatsapp";
import type { MessageType } from "@/lib/enums";

// Composes and dispatches the customer-facing messages. In STUB mode (no
// WhatsApp API credentials) the message body is still composed and written to
// the MessageLog with status "STUBBED", so the admin can see exactly what would
// have been sent. Phase 5 adds the cron jobs that trigger REMINDER_24H and
// REVIEW_REQUEST; the CONFIRMATION and CANCELLATION are triggered inline.

type BookingWithRelations = {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  startAt: Date;
  service: { name: string };
  technician: { name: string };
};

/** Build the message text for a given type. Kept pure for easy testing. */
export function composeMessage(
  type: MessageType,
  booking: BookingWithRelations,
  business: { name: string; timezone: string; whatsappNumber: string; instagram: string },
): string {
  const when = formatAppointment(booking.startAt, business.timezone);
  const firstName = booking.customerName.split(" ")[0] || booking.customerName;

  switch (type) {
    case "CONFIRMATION":
      return (
        `Hi ${firstName}! 💅 Your appointment at ${business.name} is confirmed.\n\n` +
        `• ${booking.service.name}\n` +
        `• ${when}\n` +
        `• With ${booking.technician.name}\n` +
        `• Ref: ${booking.reference}\n\n` +
        `Need to change anything? Just reply to this message. See you soon!`
      );
    case "REMINDER_24H":
      return (
        `Hi ${firstName}, a friendly reminder of your appointment at ${business.name} tomorrow:\n\n` +
        `• ${booking.service.name}\n` +
        `• ${when}\n` +
        `• With ${booking.technician.name}\n\n` +
        `Can't make it? Please let me know as soon as you can. Looking forward to seeing you! ✨`
      );
    case "REVIEW_REQUEST":
      return (
        `Hi ${firstName}, thank you so much for coming in today! 💖 I hope you're loving your nails.\n\n` +
        `If you have a moment, a quick review would mean the world` +
        (business.instagram ? ` — or tag @${business.instagram} in a photo!` : `!`) +
        `\n\nCan't wait to see you again soon. x`
      );
    case "CANCELLATION":
      return (
        `Hi ${firstName}, your appointment at ${business.name} on ${when} ` +
        `(${booking.service.name}) has been cancelled. ` +
        `Please get in touch to rebook whenever you're ready — I'd love to fit you in. x`
      );
  }
}

/** Compose + dispatch a message for a booking, recording it in the MessageLog. */
export async function sendBookingMessage(
  bookingId: string,
  type: MessageType,
): Promise<{ status: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, technician: true },
  });
  if (!booking) throw new Error(`Booking ${bookingId} not found`);

  const business = await getBusiness();
  const body = composeMessage(type, booking, business);
  const to = booking.customerPhone;

  const result = await sendWhatsApp({ to, body });

  await prisma.messageLog.create({
    data: {
      bookingId,
      type,
      channel: "whatsapp",
      status: result.status,
      body,
      toNumber: to,
      providerId: result.providerId ?? "",
      error: result.error ?? "",
      sentAt: result.status === "SENT" ? new Date() : null,
    },
  });

  return { status: result.status };
}
