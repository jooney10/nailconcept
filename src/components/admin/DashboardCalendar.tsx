"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg, DateSelectArg } from "@fullcalendar/core";
import { whatsappLink } from "@/lib/format";
import {
  moveBooking,
  confirmReschedule,
  revertReschedule,
  createManualBooking,
  blockTime,
} from "@/lib/admin/actions";

interface CalService {
  id: string;
  name: string;
  durationMin: number;
}
interface CalTech {
  id: string;
  name: string;
}

interface BusinessHour {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

interface DropState {
  id: string;
  customerName: string;
  serviceName: string;
  newStart: Date;
  newStartIso: string;
  revert: () => void;
}

interface DetailState {
  id: string;
  customerName: string;
  serviceName: string;
  technicianName: string;
  reference: string;
  phone: string;
  notes: string;
  status: string;
  rescheduleState: string;
  start: Date | null;
}

const fmt = (d: Date | null) =>
  d
    ? d.toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

export function DashboardCalendar({
  businessHours,
  businessName,
  services,
  technicians,
}: {
  businessHours: BusinessHour[];
  businessName: string;
  services: CalService[];
  technicians: CalTech[];
}) {
  const calRef = useRef<FullCalendar | null>(null);
  const [mounted, setMounted] = useState(false);
  const [initialView, setInitialView] = useState("timeGridWeek");
  const [drop, setDrop] = useState<DropState | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [newSlot, setNewSlot] = useState<Date | null>(null);

  // Avoid rendering FullCalendar during SSR (it touches the DOM); default to a
  // single-day view on phones where the week grid is too cramped.
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setInitialView("timeGridDay");
    }
  }, []);

  const refetch = () => calRef.current?.getApi().refetchEvents();

  const onEventDrop = (info: EventDropArg) => {
    setDrop({
      id: info.event.id,
      customerName: (info.event.extendedProps.customerName as string) ?? "the customer",
      serviceName: (info.event.extendedProps.serviceName as string) ?? "",
      newStart: info.event.start ?? new Date(),
      newStartIso: (info.event.start ?? new Date()).toISOString(),
      revert: info.revert,
    });
  };

  const onSelect = (info: DateSelectArg) => {
    setNewSlot(info.start);
    calRef.current?.getApi().unselect();
  };

  const onEventClick = (info: EventClickArg) => {
    if (info.event.display === "background") return;
    const p = info.event.extendedProps;
    setDetail({
      id: info.event.id,
      customerName: (p.customerName as string) ?? "",
      serviceName: (p.serviceName as string) ?? "",
      technicianName: (p.technicianName as string) ?? "",
      reference: (p.reference as string) ?? "",
      phone: (p.phone as string) ?? "",
      notes: (p.notes as string) ?? "",
      status: (p.status as string) ?? "",
      rescheduleState: (p.rescheduleState as string) ?? "NONE",
      start: info.event.start,
    });
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-3 md:p-4">
      {!mounted ? (
        <div className="grid h-[560px] place-items-center text-[var(--grey)]">
          Loading calendar…
        </div>
      ) : (
        <FullCalendar
          ref={calRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView={initialView}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth",
          }}
          firstDay={1}
          allDaySlot={false}
          nowIndicator
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          scrollTime="09:00:00"
          height={640}
          expandRows
          businessHours={businessHours}
          editable
          selectable
          selectMirror
          select={onSelect}
          eventDurationEditable={false}
          eventStartEditable
          events={(info, success, failure) => {
            // URLSearchParams encodes the "+HH:MM" offset so it isn't read as a space.
            const qs = new URLSearchParams({ start: info.startStr, end: info.endStr });
            fetch(`/api/admin/calendar?${qs.toString()}`)
              .then((r) => r.json())
              .then((d) => success(d.events))
              .catch(failure);
          }}
          eventDrop={onEventDrop}
          eventClick={onEventClick}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        />
      )}

      {drop && (
        <DropDialog
          drop={drop}
          businessName={businessName}
          onClose={() => setDrop(null)}
          onDone={() => {
            setDrop(null);
            refetch();
          }}
        />
      )}

      {detail && (
        <DetailDialog
          detail={detail}
          businessName={businessName}
          onClose={() => setDetail(null)}
          onChanged={() => {
            setDetail(null);
            refetch();
          }}
        />
      )}

      {newSlot && (
        <NewBookingDialog
          start={newSlot}
          services={services}
          technicians={technicians}
          onClose={() => setNewSlot(null)}
          onDone={() => {
            setNewSlot(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function NewBookingDialog({
  start,
  services,
  technicians,
  onClose,
  onDone,
}: {
  start: Date;
  services: CalService[];
  technicians: CalTech[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [technicianId, setTechnicianId] = useState(technicians[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const add = () =>
    startTransition(async () => {
      const res = await createManualBooking({
        technicianId,
        serviceId,
        startIso: start.toISOString(),
        customerName: name,
        customerPhone: phone,
        notes,
        notify,
      });
      if (res.ok) onDone();
      else setNote(res.message ?? "Could not add booking.");
    });

  const block = () =>
    startTransition(async () => {
      const end = new Date(start.getTime() + 60 * 60_000);
      const res = await blockTime(technicianId, start.toISOString(), end.toISOString(), "Blocked");
      if (res.ok) onDone();
      else setNote(res.message ?? "Could not block time.");
    });

  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl">New booking</h2>
      <p className="mt-1 text-sm font-semibold" style={{ color: "var(--brand-dark)" }}>
        {fmt(start)}
      </p>

      <div className="mt-4 grid gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Service</span>
          <select className="fld" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMin} min)
              </option>
            ))}
          </select>
        </label>
        {technicians.length > 1 && (
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Technician</span>
            <select
              className="fld"
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Customer name</span>
          <input className="fld" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Mobile number</span>
          <input className="fld" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07700 900123" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Notes (optional)</span>
          <input className="fld" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Send the customer a WhatsApp confirmation
        </label>
      </div>

      {note && <p className="mt-3 text-sm font-semibold text-[var(--rose-dark)]">{note}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={add} disabled={pending} className="btn btn-primary disabled:opacity-50">
          {pending ? "Adding…" : "Add booking"}
        </button>
        <button onClick={block} disabled={pending} className="btn btn-ghost disabled:opacity-50">
          Block this hour
        </button>
        <button onClick={onClose} className="text-sm font-semibold text-[var(--grey)]">
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function DropDialog({
  drop,
  businessName,
  onClose,
  onDone,
}: {
  drop: DropState;
  businessName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const run = (notify: boolean) =>
    startTransition(async () => {
      const res = await moveBooking(drop.id, drop.newStartIso, notify);
      if (res.ok) onDone();
      else setNote(res.message ?? "Could not move booking.");
    });

  const cancel = () => {
    drop.revert();
    onClose();
  };

  return (
    <Modal onClose={cancel}>
      <h2 className="text-2xl">Move appointment</h2>
      <p className="mt-2 text-[var(--ink-soft)]">
        Move <strong>{drop.customerName}</strong>
        {drop.serviceName ? ` (${drop.serviceName})` : ""} to:
      </p>
      <p className="mt-1 font-bold" style={{ color: "var(--brand-dark)" }}>
        {fmt(drop.newStart)}
      </p>

      <div className="mt-5 grid gap-2">
        <button
          onClick={() => run(true)}
          disabled={pending}
          className="btn btn-primary w-full disabled:opacity-50"
        >
          Ask {drop.customerName.split(" ")[0]} to confirm via WhatsApp
        </button>
        <button
          onClick={() => run(false)}
          disabled={pending}
          className="btn btn-ghost w-full disabled:opacity-50"
        >
          Just move it (no message)
        </button>
        <button onClick={cancel} className="mt-1 text-sm font-semibold text-[var(--grey)]">
          Cancel — put it back
        </button>
      </div>
      {note && <p className="mt-3 text-sm font-semibold text-[var(--rose-dark)]">{note}</p>}
      <p className="mt-3 text-xs text-[var(--grey)]">
        {businessName} will message the customer; they reply YES to confirm.
      </p>
    </Modal>
  );
}

function DetailDialog({
  detail,
  businessName,
  onClose,
  onChanged,
}: {
  detail: DetailState;
  businessName: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const awaiting = detail.rescheduleState === "AWAITING";

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) onChanged();
      else setNote(res.message ?? "Something went wrong.");
    });

  const contactText = `Hi ${detail.customerName.split(" ")[0]}, it's ${businessName} about your appointment (ref ${detail.reference}).`;

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl">{detail.customerName}</h2>
        {awaiting && (
          <span className="rounded-full bg-[#fdeccb] px-2.5 py-1 text-xs font-bold text-[#a8760b]">
            Awaiting confirmation
          </span>
        )}
      </div>
      <div className="mt-3 grid gap-1.5 text-sm">
        <Row label="Service" value={detail.serviceName} />
        <Row label="When" value={fmt(detail.start)} />
        <Row label="Technician" value={detail.technicianName} />
        <Row label="Reference" value={detail.reference} />
        <Row label="Phone" value={detail.phone} />
        {detail.notes && <Row label="Notes" value={detail.notes} />}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={whatsappLink(detail.phone, contactText)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-whatsapp"
        >
          Message
        </a>
        {awaiting && (
          <>
            <button
              onClick={() => run(() => confirmReschedule(detail.id))}
              disabled={pending}
              className="btn btn-primary disabled:opacity-50"
            >
              Confirm reschedule
            </button>
            <button
              onClick={() => run(() => revertReschedule(detail.id))}
              disabled={pending}
              className="btn btn-ghost disabled:opacity-50"
            >
              Revert to original
            </button>
          </>
        )}
      </div>
      {awaiting && (
        <p className="mt-3 text-xs text-[var(--grey)]">
          When WhatsApp is live, a customer&apos;s “yes” confirms this automatically.
          Use “Confirm” if they reply another way.
        </p>
      )}
      {note && <p className="mt-3 text-sm font-semibold text-[var(--rose-dark)]">{note}</p>}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--grey)]">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
