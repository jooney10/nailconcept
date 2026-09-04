import Link from "next/link";
import { whatsappLink } from "@/lib/format";
import type { BusinessRecord } from "@/lib/business";

export function SiteHeader({ business }: { business: BusinessRecord }) {
  const initial = business.name.trim().charAt(0).toUpperCase() || "A";
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--cream)_88%,transparent)] backdrop-blur-md">
      <div className="wrap flex h-[64px] items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2" aria-label={business.name}>
          <span
            className="grid h-9 w-9 flex-none place-items-center rounded-full text-white font-[family-name:var(--font-display)] text-lg"
            style={{ background: "var(--brand)" }}
            aria-hidden
          >
            {initial}
          </span>
          <span className="hidden whitespace-nowrap font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:inline">
            {business.name}
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 text-sm font-semibold text-[var(--ink-soft)] md:flex"
        >
          <a className="transition-colors hover:text-[var(--brand-dark)]" href="/#services">
            Treatments
          </a>
          <a className="transition-colors hover:text-[var(--brand-dark)]" href="/#gallery">
            Gallery
          </a>
          <a className="transition-colors hover:text-[var(--brand-dark)]" href="/#about">
            About
          </a>
          <a className="transition-colors hover:text-[var(--brand-dark)]" href="/#contact">
            Contact
          </a>
        </nav>

        <div className="flex flex-none items-center gap-2">
          {business.whatsappNumber && (
            <a
              className="btn btn-ghost hidden sm:inline-flex"
              href={whatsappLink(
                business.whatsappNumber,
                `Hi ${business.name}, I have a question…`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Message
            </a>
          )}
          <Link className="btn btn-primary whitespace-nowrap px-4 py-2.5 text-sm sm:px-5" href="/book">
            Book now
          </Link>
        </div>
      </div>
    </header>
  );
}
