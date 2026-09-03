"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { whatsappLink } from "@/lib/format";
import {
  cancelBooking,
  completeBooking,
  markNoShow,
  type ActionResult,
} from "@/lib/admin/actions";

export function BookingActions({
  id,
  phone,
  customerName,
  reference,
  status,
  businessName,
  whenLabel,
}: {
  id: string;
  phone: string;
  customerName: string;
  reference: string;
  status: string;
  businessName: string;
  whenLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const run = (fn: () => Promise<ActionResult>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    startTransition(async () => {
      const res = await fn();
      setNote(res.message ?? (res.ok ? "Done." : "Something went wrong."));
      router.refresh();
    });
  };

  const firstName = customerName.split(" ")[0] || customerName;
  const contactText = `Hi ${firstName}, it's ${businessName} regarding your appointment (${whenLabel}, ref ${reference}).`;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1.5">
        <a
          href={whatsappLink(phone, contactText)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-2.5 py-1.5 text-xs font-bold"
          style={{ background: "#25d366", color: "#06331b" }}
        >
          Message
        </a>
        {status === "CONFIRMED" && (
          <>
            <button
              onClick={() => run(() => completeBooking(id))}
              disabled={pending}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink-soft)] hover:border-[var(--brand)] disabled:opacity-50"
            >
              Complete
            </button>
            <button
              onClick={() => run(() => markNoShow(id))}
              disabled={pending}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink-soft)] hover:border-[var(--brand)] disabled:opacity-50"
            >
              No-show
            </button>
            <button
              onClick={() =>
                run(
                  () => cancelBooking(id),
                  `Cancel ${customerName}'s appointment and send a cancellation message?`,
                )
              }
              disabled={pending}
              className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              style={{ background: "var(--rose-dark)" }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
      {note && <span className="text-xs text-[var(--grey)]">{note}</span>}
    </div>
  );
}
