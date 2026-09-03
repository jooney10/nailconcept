"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--blush)] hover:text-[var(--brand-dark)]"
    >
      Sign out
    </button>
  );
}
