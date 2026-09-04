import Link from "next/link";
import { whatsappLink } from "@/lib/format";
import type { BusinessRecord } from "@/lib/business";

// Sticky bottom call-to-action shown only on mobile, so "Book" is always one tap
// away as the customer scrolls. Hidden on md+ where the header CTA is visible.
export function MobileBookBar({ business }: { business: BusinessRecord }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--cream)_92%,transparent)] px-4 py-3 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex gap-2">
        {business.whatsappNumber && (
          <a
            className="btn btn-whatsapp flex-none px-4"
            href={whatsappLink(
              business.whatsappNumber,
              `Hi ${business.name}, I have a question…`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Message on WhatsApp"
          >
            Chat
          </a>
        )}
        <Link href="/book" className="btn btn-primary flex-1">
          Book an appointment →
        </Link>
      </div>
    </div>
  );
}
