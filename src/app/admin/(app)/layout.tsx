import Link from "next/link";
import { requireSession } from "@/lib/admin/session";
import { getBusiness } from "@/lib/business";
import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";

export default async function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  const business = await getBusiness();
  const isOwner = user.role === "OWNER";

  return (
    <div className="mx-auto flex min-h-screen max-w-[1200px] flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="border-b border-[var(--border)] bg-white md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4 md:block">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 place-items-center rounded-full text-white font-[family-name:var(--font-display)]"
              style={{ background: "var(--brand)" }}
              aria-hidden
            >
              {business.name.charAt(0)}
            </span>
            <span className="font-[family-name:var(--font-display)] font-semibold">
              {business.name}
            </span>
          </Link>
          <span className="rounded-full bg-[var(--blush)] px-2.5 py-1 text-xs font-bold text-[var(--brand-dark)] md:mt-3 md:inline-block">
            {isOwner ? "Owner" : "Staff"}
          </span>
        </div>
        <div className="px-3 pb-3 md:mt-2">
          <AdminNav isOwner={isOwner} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-5 py-3">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--ink-soft)] hover:text-[var(--brand-dark)]"
          >
            View live site ↗
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--grey)] sm:inline">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
