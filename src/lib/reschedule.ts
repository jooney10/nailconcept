import { prisma } from "@/lib/prisma";
import { sendBookingMessage } from "@/lib/messaging";
import { normalizeUkPhone } from "@/lib/booking-service";

// Interpreting a customer's free-text reply to a reschedule request.

const AFFIRMATIVE = /\b(yes|yep|yeah|yup|ya|ok|okay|confirm|confirmed|perfect|great|fine|good|works|👍|✅)\b/i;
const NEGATIVE = /\b(no|nope|nah|can'?t|cannot|won'?t|unable|another|different|doesn'?t)\b/i;

export type ReplyOutcome =
  | { result: "confirmed"; reference: string; customerName: string }
  | { result: "declined"; reference: string; customerName: string }
  | { result: "no_match" }
  | { result: "ambiguous"; reference: string };

/**
 * Apply a customer's inbound reply to their most recent pending reschedule.
 * Affirmative → confirm (send confirmation). Negative → revert to the original
 * time. Anything else is left for the technician to follow up manually.
 */
export async function handleInboundReply(
  fromPhone: string,
  text: string,
): Promise<ReplyOutcome> {
  const phone = normalizeUkPhone(fromPhone);

  const booking = await prisma.booking.findFirst({
    where: { customerPhone: phone, rescheduleState: "AWAITING" },
    orderBy: { rescheduleRequestedAt: "desc" },
  });
  if (!booking) return { result: "no_match" };

  const affirmative = AFFIRMATIVE.test(text);
  const negative = NEGATIVE.test(text);

  // Affirmative wins if both somehow match.
  if (affirmative && !negative) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        rescheduleState: "NONE",
        previousStartAt: null,
        previousEndAt: null,
        rescheduleRequestedAt: null,
      },
    });
    try {
      await sendBookingMessage(booking.id, "RESCHEDULE_CONFIRMED");
    } catch (err) {
      console.error("Reschedule confirmation send failed:", err);
    }
    return { result: "confirmed", reference: booking.reference, customerName: booking.customerName };
  }

  if (negative) {
    // Revert to the original time if we have it.
    if (booking.previousStartAt && booking.previousEndAt) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          startAt: booking.previousStartAt,
          endAt: booking.previousEndAt,
          rescheduleState: "NONE",
          previousStartAt: null,
          previousEndAt: null,
          rescheduleRequestedAt: null,
        },
      });
    } else {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { rescheduleState: "NONE" },
      });
    }
    return { result: "declined", reference: booking.reference, customerName: booking.customerName };
  }

  return { result: "ambiguous", reference: booking.reference };
}
