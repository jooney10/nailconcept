import Link from "next/link";
import { whatsappLink } from "@/lib/format";
import type { BusinessRecord } from "@/lib/business";

export function ContactSection({ business }: { business: BusinessRecord }) {
  return (
    <section id="contact" className="section scroll-mt-20">
      <div className="wrap">
        <div
          className="relative overflow-hidden rounded-[var(--radius-lg)] px-6 py-14 text-center md:px-16"
          style={{
            background: "linear-gradient(150deg, var(--brand) 0%, var(--brand-dark) 100%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              background:
                "radial-gradient(60% 80% at 80% 10%, #fff 0%, transparent 55%)",
            }}
          />
          <div className="relative mx-auto max-w-2xl text-white">
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/80">
              Questions?
            </span>
            <h2 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] text-white">
              Let&apos;s get you booked in
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/90">
              Not sure which treatment you need, or want to check something before
              booking? Message me directly — I usually reply the same day.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/book"
                className="btn"
                style={{ background: "#fff", color: "var(--brand-dark)" }}
              >
                Book online →
              </Link>
              {business.whatsappNumber && (
                <a
                  className="btn btn-whatsapp"
                  href={whatsappLink(
                    business.whatsappNumber,
                    `Hi ${business.name}, I have a quick question…`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chat on WhatsApp
                </a>
              )}
            </div>
            <p className="mt-6 text-sm text-white/75">
              {business.addressLine}
              {business.email ? ` · ${business.email}` : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
