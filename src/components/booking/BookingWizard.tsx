"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDuration, formatPrice, whatsappLink } from "@/lib/format";

interface WService {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  pricePence: number;
  priceText: string;
  category: string;
}
interface WTech {
  id: string;
  name: string;
  bio: string;
  serviceIds: string[];
}
interface AvailSlot {
  time: string;
  iso: string;
  technicianIds: string[];
}
interface AvailDay {
  date: string;
  label: string;
  slotCount: number;
  slots: AvailSlot[];
}
interface AvailabilityResponse {
  service: { id: string; name: string; durationMin: number };
  technicianOptions: { id: string; name: string }[];
  days: AvailDay[];
}

type Step = "service" | "tech" | "time" | "details" | "done";

function to12h(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ap = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

export function BookingWizard({
  services,
  technicians,
  preselectServiceId,
  preselectTechId,
  whatsappNumber,
  businessName,
}: {
  services: WService[];
  technicians: WTech[];
  preselectServiceId?: string;
  preselectTechId?: string;
  whatsappNumber: string;
  businessName: string;
}) {
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [techId, setTechId] = useState<string>("any");

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailSlot | null>(null);
  const [selectedDayLabel, setSelectedDayLabel] = useState<string>("");

  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    reference: string;
    when: string;
    technicianName: string;
    serviceName: string;
  } | null>(null);

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  const techsOffering = useMemo(
    () => (serviceId ? technicians.filter((t) => t.serviceIds.includes(serviceId)) : []),
    [technicians, serviceId],
  );
  const needsTechChoice = techsOffering.length > 1;

  const stepList: { key: Step; label: string }[] = useMemo(() => {
    const base: { key: Step; label: string }[] = [{ key: "service", label: "Treatment" }];
    if (needsTechChoice) base.push({ key: "tech", label: "Technician" });
    base.push({ key: "time", label: "Date & time" });
    base.push({ key: "details", label: "Your details" });
    return base;
  }, [needsTechChoice]);

  const fetchAvailability = useCallback(
    async (svcId: string, tId: string) => {
      setLoadingAvail(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ serviceId: svcId });
        if (tId && tId !== "any") qs.set("technicianId", tId);
        const res = await fetch(`/api/availability?${qs.toString()}`);
        if (!res.ok) throw new Error("Could not load availability.");
        const data: AvailabilityResponse = await res.json();
        setAvailability(data);
        setSelectedDate(data.days[0]?.date ?? null);
      } catch {
        setError("Sorry, we couldn't load available times. Please try again.");
        setAvailability(null);
      } finally {
        setLoadingAvail(false);
      }
    },
    [],
  );

  const goToTime = useCallback(
    (svcId: string, tId: string) => {
      setStep("time");
      fetchAvailability(svcId, tId);
    },
    [fetchAvailability],
  );

  const chooseService = useCallback(
    (id: string) => {
      setServiceId(id);
      setSelectedSlot(null);
      setAvailability(null);
      const offering = technicians.filter((t) => t.serviceIds.includes(id));
      if (offering.length > 1) {
        setTechId("any");
        setStep("tech");
      } else {
        const only = offering[0]?.id ?? "any";
        setTechId(only);
        goToTime(id, only);
      }
    },
    [technicians, goToTime],
  );

  // Apply preselection from ?service= / ?tech= once on mount.
  useEffect(() => {
    if (preselectServiceId && services.some((s) => s.id === preselectServiceId)) {
      if (preselectTechId) setTechId(preselectTechId);
      chooseService(preselectServiceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseTech = (id: string) => {
    setTechId(id);
    if (serviceId) goToTime(serviceId, id);
  };

  const chooseSlot = (day: AvailDay, slot: AvailSlot) => {
    setSelectedSlot(slot);
    setSelectedDayLabel(day.label);
    setStep("details");
    setError(null);
  };

  const submit = async () => {
    if (!service || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          technicianId: techId,
          startIso: selectedSlot.iso,
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: form.email || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        // If the slot was taken, send them back to pick another time.
        if (res.status === 409 && serviceId) {
          setStep("time");
          fetchAvailability(serviceId, techId);
        }
        return;
      }
      setConfirmation(data);
      setStep("done");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeDay = availability?.days.find((d) => d.date === selectedDate) ?? null;

  // -------------------------------------------------------------------------
  return (
    <div>
      {step !== "done" && (
        <>
          <h1 className="text-[clamp(1.8rem,5vw,2.6rem)]">Book your appointment</h1>
          <StepTracker steps={stepList} current={step} />
        </>
      )}

      {/* STEP 1 — SERVICE */}
      {step === "service" && (
        <section aria-label="Choose a treatment" className="mt-6 grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => chooseService(s.id)}
              className="surface flex flex-col gap-2 p-5 text-left transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-[family-name:var(--font-fraunces)] text-lg">
                  {s.name}
                </span>
                <span
                  className="whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold"
                  style={{ background: "var(--blush)", color: "var(--brand-dark)" }}
                >
                  {formatPrice(s.pricePence, s.priceText)}
                </span>
              </div>
              {s.description && (
                <span className="text-sm text-[var(--ink-soft)]">{s.description}</span>
              )}
              <span className="mt-1 text-sm font-semibold text-[var(--grey)]">
                ⏱ {formatDuration(s.durationMin)}
              </span>
            </button>
          ))}
        </section>
      )}

      {/* STEP 2 — TECHNICIAN */}
      {step === "tech" && service && (
        <section aria-label="Choose a technician" className="mt-6">
          <SummaryBar service={service} onEdit={() => setStep("service")} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => chooseTech("any")}
              className="surface p-5 text-left transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="font-[family-name:var(--font-fraunces)] text-lg">
                No preference
              </div>
              <div className="text-sm text-[var(--ink-soft)]">
                Show me the earliest available times with any technician.
              </div>
            </button>
            {techsOffering.map((t) => (
              <button
                key={t.id}
                onClick={() => chooseTech(t.id)}
                className="surface p-5 text-left transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="font-[family-name:var(--font-fraunces)] text-lg">{t.name}</div>
                {t.bio && <div className="text-sm text-[var(--ink-soft)]">{t.bio}</div>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STEP 3 — TIME */}
      {step === "time" && service && (
        <section aria-label="Choose a date and time" className="mt-6">
          <SummaryBar
            service={service}
            onEdit={() => setStep(needsTechChoice ? "tech" : "service")}
          />
          {loadingAvail && (
            <p className="mt-8 text-center text-[var(--ink-soft)]">Loading available times…</p>
          )}
          {!loadingAvail && availability && availability.days.length === 0 && (
            <div className="surface mt-6 p-6 text-center">
              <p className="text-[var(--ink-soft)]">
                No online slots in the next few weeks — please message to arrange a time.
              </p>
              {whatsappNumber && (
                <a
                  className="btn btn-whatsapp mt-4"
                  href={whatsappLink(
                    whatsappNumber,
                    `Hi ${businessName}, I'd like to book ${service.name} but couldn't see a slot online.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Message on WhatsApp
                </a>
              )}
            </div>
          )}
          {!loadingAvail && activeDay && (
            <div className="mt-5">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {availability!.days.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => setSelectedDate(d.date)}
                    className="flex-none rounded-xl border px-4 py-2 text-sm font-bold transition-colors"
                    style={
                      d.date === selectedDate
                        ? { background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }
                        : { background: "#fff", borderColor: "var(--border)" }
                    }
                  >
                    <div>{d.label}</div>
                    <div className="text-xs font-semibold opacity-80">
                      {d.slotCount} {d.slotCount === 1 ? "slot" : "slots"}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {activeDay.slots.map((slot) => (
                  <button
                    key={slot.iso}
                    onClick={() => chooseSlot(activeDay, slot)}
                    className="rounded-xl border border-[var(--border)] bg-white px-2 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:border-[var(--brand)] hover:text-[var(--brand-dark)]"
                  >
                    {to12h(slot.time)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="mt-4 text-sm font-semibold text-[var(--rose-dark)]">{error}</p>}
        </section>
      )}

      {/* STEP 4 — DETAILS */}
      {step === "details" && service && selectedSlot && (
        <section aria-label="Your details" className="mt-6">
          <div className="surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-4">
              <div>
                <div className="font-[family-name:var(--font-fraunces)] text-xl">
                  {service.name}
                </div>
                <div className="text-sm text-[var(--ink-soft)]">
                  {selectedDayLabel} · {to12h(selectedSlot.time)} · {formatDuration(service.durationMin)}
                </div>
              </div>
              <button
                onClick={() => setStep("time")}
                className="text-sm font-bold text-[var(--brand-dark)] hover:text-[var(--brand)]"
              >
                Change
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <Field label="Your name" required>
                <input
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="fld"
                  placeholder="Jane Smith"
                />
              </Field>
              <Field label="Mobile number" required hint="So we can send your confirmation & reminder">
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="fld"
                  placeholder="07700 900123"
                />
              </Field>
              <Field label="Email (optional)">
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="fld"
                  placeholder="jane@example.com"
                />
              </Field>
              <Field label="Anything I should know? (optional)" hint="Inspo, allergies, nail shape…">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="fld min-h-[80px] resize-y"
                  placeholder="e.g. I'd love an almond shape, chrome finish"
                />
              </Field>
            </div>

            {error && (
              <p className="mt-4 text-sm font-semibold text-[var(--rose-dark)]">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={submitting || form.name.trim().length < 2 || form.phone.trim().length < 7}
              className="btn btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Booking…" : "Confirm booking →"}
            </button>
            <p className="mt-3 text-center text-xs text-[var(--grey)]">
              You&apos;ll get a WhatsApp confirmation and a reminder before your appointment.
            </p>
          </div>
        </section>
      )}

      {/* DONE */}
      {step === "done" && confirmation && (
        <section aria-label="Booking confirmed" className="mt-4 text-center">
          <div
            className="mx-auto grid h-16 w-16 place-items-center rounded-full text-3xl text-white"
            style={{ background: "#25d366" }}
          >
            ✓
          </div>
          <h1 className="mt-5 text-[clamp(1.8rem,5vw,2.6rem)]">You&apos;re booked in!</h1>
          <p className="mx-auto mt-3 max-w-md text-[var(--ink-soft)]">
            {confirmation.serviceName} with {confirmation.technicianName}
          </p>
          <div className="surface mx-auto mt-6 max-w-sm p-6 text-left">
            <Row label="When" value={confirmation.when} />
            <Row label="Technician" value={confirmation.technicianName} />
            <Row label="Reference" value={confirmation.reference} last />
          </div>
          <p className="mx-auto mt-5 max-w-md text-sm text-[var(--grey)]">
            A confirmation has been sent to your WhatsApp, with a friendly reminder to follow the
            day before. Can&apos;t wait to see you! 💅
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/" className="btn btn-ghost">
              Back to site
            </Link>
            {whatsappNumber && (
              <a
                className="btn btn-whatsapp"
                href={whatsappLink(whatsappNumber, `Hi ${businessName}, about my booking ${confirmation.reference}…`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Message
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function StepTracker({ steps, current }: { steps: { key: Step; label: string }[]; current: Step }) {
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {steps.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "todo";
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className="grid h-6 w-6 place-items-center rounded-full text-xs font-bold"
              style={
                state === "todo"
                  ? { background: "var(--blush)", color: "var(--grey)" }
                  : { background: "var(--brand)", color: "#fff" }
              }
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span
              className="font-semibold"
              style={{ color: state === "current" ? "var(--ink)" : "var(--grey)" }}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="mx-1 text-[var(--border)]">—</span>}
          </li>
        );
      })}
    </ol>
  );
}

function SummaryBar({ service, onEdit }: { service: WService; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[var(--blush)] px-4 py-3">
      <span className="text-sm font-semibold text-[var(--brand-dark)]">
        {service.name} · {formatDuration(service.durationMin)} ·{" "}
        {formatPrice(service.pricePence, service.priceText)}
      </span>
      <button onClick={onEdit} className="text-sm font-bold text-[var(--brand-dark)] hover:underline">
        Change
      </button>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-[var(--ink)]">
        {label}
        {required && <span className="text-[var(--rose-dark)]"> *</span>}
      </span>
      {hint && <span className="mb-1.5 block text-xs text-[var(--grey)]">{hint}</span>}
      {children}
    </label>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-4 py-2.5 ${
        last ? "" : "border-b border-[var(--border)]"
      }`}
    >
      <span className="text-sm text-[var(--grey)]">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
