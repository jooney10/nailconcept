import { redirect } from "next/navigation";
import { auth } from "@/auth";

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  technicianId: string | null;
}

/** Current admin user or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: session.user.role,
    technicianId: session.user.technicianId,
  };
}

/** Require any signed-in admin; redirect to login otherwise. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Require an owner; redirect staff back to the dashboard. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "OWNER") redirect("/admin");
  return user;
}

export function isOwner(user: SessionUser | null): boolean {
  return user?.role === "OWNER";
}
