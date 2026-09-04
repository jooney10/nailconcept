"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; icon: string; ownerOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: "◇" },
  { href: "/admin/bookings", label: "Bookings", icon: "▤" },
  { href: "/admin/availability", label: "Availability", icon: "◷" },
  { href: "/admin/services", label: "Services", icon: "✦" },
  { href: "/admin/technicians", label: "Technicians", icon: "❋", ownerOnly: true },
  { href: "/admin/messages", label: "Messages", icon: "✉" },
  { href: "/admin/settings", label: "Settings", icon: "⚙", ownerOnly: true },
  { href: "/admin/account", label: "Account", icon: "◉" },
];

export function AdminNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.ownerOnly || isOwner);

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-none items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors"
            style={
              active
                ? { background: "var(--brand)", color: "#fff" }
                : { color: "var(--ink-soft)" }
            }
          >
            <span aria-hidden className="text-base opacity-90">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
