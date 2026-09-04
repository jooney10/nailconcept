import { requireSession } from "@/lib/admin/session";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireSession();

  return (
    <div>
      <h1 className="text-3xl">Account</h1>
      <p className="mt-1 text-[var(--grey)]">
        Signed in as {user.email} ({user.role === "OWNER" ? "Owner" : "Staff"}).
      </p>
      <ChangePasswordForm />
    </div>
  );
}
