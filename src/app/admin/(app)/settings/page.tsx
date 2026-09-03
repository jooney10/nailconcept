import { requireOwner } from "@/lib/admin/session";
import { getBusiness } from "@/lib/business";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireOwner();
  const b = await getBusiness();

  return (
    <div>
      <h1 className="text-3xl">Settings</h1>
      <p className="mt-1 text-[var(--grey)]">Your brand, contact details and booking rules.</p>
      <SettingsForm
        initial={{
          name: b.name,
          tagline: b.tagline,
          aboutHeading: b.aboutHeading,
          aboutBody: b.aboutBody,
          whatsappNumber: b.whatsappNumber,
          email: b.email,
          addressLine: b.addressLine,
          instagram: b.instagram,
          colorPrimary: b.colorPrimary,
          colorAccent: b.colorAccent,
          timezone: b.timezone,
          slotIntervalMin: b.slotIntervalMin,
          bufferBeforeMin: b.bufferBeforeMin,
          bufferAfterMin: b.bufferAfterMin,
          minNoticeHours: b.minNoticeHours,
          maxAdvanceDays: b.maxAdvanceDays,
          cancellationWindowHrs: b.cancellationWindowHrs,
        }}
      />
    </div>
  );
}
