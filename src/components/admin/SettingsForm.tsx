"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBusiness, type BusinessInput } from "@/lib/admin/actions";

export function SettingsForm({ initial }: { initial: BusinessInput }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<BusinessInput>(initial);
  const [note, setNote] = useState<string | null>(null);

  const set = <K extends keyof BusinessInput>(k: K, v: BusinessInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    startTransition(async () => {
      const res = await updateBusiness(form);
      setNote(res.message ?? null);
      router.refresh();
    });
  };

  return (
    <div className="mt-6 grid max-w-3xl gap-6">
      <Card title="Brand & story">
        <Text label="Business name" value={form.name} onChange={(v) => set("name", v)} />
        <Text label="Tagline" value={form.tagline} onChange={(v) => set("tagline", v)} />
        <Text label="About heading" value={form.aboutHeading} onChange={(v) => set("aboutHeading", v)} />
        <Area label="About text" value={form.aboutBody} onChange={(v) => set("aboutBody", v)} />
      </Card>

      <Card title="Contact & social">
        <Text label="WhatsApp number" hint="UK format, e.g. 447700900123 (used for messages)" value={form.whatsappNumber} onChange={(v) => set("whatsappNumber", v)} />
        <Text label="Email" value={form.email} onChange={(v) => set("email", v)} />
        <Text label="Location line" value={form.addressLine} onChange={(v) => set("addressLine", v)} />
        <Text label="Instagram handle" hint="Without the @" value={form.instagram} onChange={(v) => set("instagram", v)} />
      </Card>

      <Card title="Colours">
        <div className="flex gap-6">
          <Color label="Primary" value={form.colorPrimary} onChange={(v) => set("colorPrimary", v)} />
          <Color label="Accent" value={form.colorAccent} onChange={(v) => set("colorAccent", v)} />
        </div>
      </Card>

      <Card title="Booking rules">
        <div className="grid grid-cols-2 gap-4">
          <Num label="Buffer before (min)" value={form.bufferBeforeMin} onChange={(v) => set("bufferBeforeMin", v)} />
          <Num label="Buffer after (min)" value={form.bufferAfterMin} onChange={(v) => set("bufferAfterMin", v)} />
          <Num label="Slot interval (min)" value={form.slotIntervalMin} onChange={(v) => set("slotIntervalMin", v)} />
          <Num label="Min notice (hours)" value={form.minNoticeHours} onChange={(v) => set("minNoticeHours", v)} />
          <Num label="Book up to (days ahead)" value={form.maxAdvanceDays} onChange={(v) => set("maxAdvanceDays", v)} />
          <Num label="Cancellation window (hrs)" value={form.cancellationWindowHrs} onChange={(v) => set("cancellationWindowHrs", v)} />
        </div>
        <Text label="Timezone" hint="IANA name, e.g. Europe/London" value={form.timezone} onChange={(v) => set("timezone", v)} />
      </Card>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending} className="btn btn-primary disabled:opacity-50">
          {pending ? "Saving…" : "Save settings"}
        </button>
        {note && <span className="text-sm text-[var(--grey)]">{note}</span>}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-6">
      <h2 className="mb-4 text-xl">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
function Text({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      {hint && <span className="mb-1 block text-xs text-[var(--grey)]">{hint}</span>}
      <input className="fld" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <textarea className="fld min-h-[120px]" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input type="number" min="0" className="fld" value={value} onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)} />
    </label>
  );
}
function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 rounded-lg border border-[var(--border)]" />
        <input className="fld w-32" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </label>
  );
}
