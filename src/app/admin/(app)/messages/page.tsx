import { requireSession } from "@/lib/admin/session";
import { getBusiness } from "@/lib/business";
import { prisma } from "@/lib/prisma";
import { scopeWhere } from "@/lib/admin/queries";
import { formatShort } from "@/lib/datetime";
import { MESSAGE_TYPE_LABELS, type MessageType } from "@/lib/enums";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  SENT: { bg: "#e5f4ea", fg: "#1c7a43" },
  STUBBED: { bg: "var(--blush)", fg: "var(--brand-dark)" },
  FAILED: { bg: "#f6e4e2", fg: "#a6534e" },
  SKIPPED: { bg: "#efe9e7", fg: "#6f5d58" },
};

export default async function MessagesPage() {
  const user = await requireSession();
  const business = await getBusiness();
  const whatsappLive = process.env.WHATSAPP_ENABLED === "true";

  // Scope messages to the user's own bookings if they're staff.
  const messages = await prisma.messageLog.findMany({
    where: { booking: scopeWhere(user) },
    include: {
      booking: { select: { customerName: true, reference: true, service: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-3xl">Messages</h1>
      <p className="mt-1 text-[var(--grey)]">
        Every confirmation, reminder and review request the system composes.
      </p>

      {!whatsappLive && (
        <div className="mt-4 rounded-xl bg-[var(--blush)] p-4 text-sm text-[var(--brand-dark)]">
          <strong>Stub mode.</strong> WhatsApp sending is off, so messages are
          composed and logged here but not delivered. Add your WhatsApp Business
          API credentials (see the project README) to switch on live delivery —
          no other changes needed.
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-white">
        {messages.length === 0 ? (
          <p className="p-8 text-center text-[var(--grey)]">No messages yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {messages.map((m) => {
              const style = STATUS_STYLE[m.status] ?? STATUS_STYLE.STUBBED;
              return (
                <li key={m.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {MESSAGE_TYPE_LABELS[m.type as MessageType] ?? m.type}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                        style={{ background: style.bg, color: style.fg }}
                      >
                        {m.status}
                      </span>
                    </div>
                    <span className="text-sm text-[var(--grey)]">
                      {formatShort(m.createdAt, business.timezone)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-[var(--grey)]">
                    To {m.booking.customerName} · {m.booking.service.name} · {m.booking.reference}
                    {m.toNumber ? ` · ${m.toNumber}` : ""}
                  </div>
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-[var(--cream)] p-3 text-sm">
                    {m.body}
                  </p>
                  {m.error && (
                    <p className="mt-1 text-sm font-semibold text-[var(--rose-dark)]">{m.error}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
