import Link from "next/link";
import type { BusinessRecord } from "@/lib/business";

export function SiteFooter({ business }: { business: BusinessRecord }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border)] bg-white">
      <div className="wrap flex flex-col items-center justify-between gap-4 py-8 text-sm text-[var(--grey)] sm:flex-row">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-full text-white text-sm font-[family-name:var(--font-fraunces)]"
            style={{ background: "var(--brand)" }}
            aria-hidden
          >
            {business.name.charAt(0)}
          </span>
          <span className="font-semibold text-[var(--ink)]">{business.name}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-5">
          <a className="hover:text-[var(--brand-dark)]" href="/#services">Treatments</a>
          <a className="hover:text-[var(--brand-dark)]" href="/#gallery">Gallery</a>
          <a className="hover:text-[var(--brand-dark)]" href="/#about">About</a>
          <Link className="hover:text-[var(--brand-dark)]" href="/book">Book</Link>
          {business.instagram && (
            <a
              className="hover:text-[var(--brand-dark)]"
              href={`https://instagram.com/${business.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          )}
        </nav>
        <div className="text-center sm:text-right">
          © {year} {business.name}
        </div>
      </div>
    </footer>
  );
}
