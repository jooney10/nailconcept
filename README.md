# Abigail Nails — Booking Platform

A full-stack booking platform for a home-based nail studio, built by Symplify
Solutions. Customers browse treatments, meet the technicians, view a gallery,
and book real appointments against live availability. The technician(s) manage
everything from an admin dashboard, and customers receive automated WhatsApp
messages (confirmation, 24-hour reminder, post-session review request).

Built to replace a ~£68/month Timely subscription with a system that costs
roughly £0–5/month at a sole trader's volume.

---

## Features

**Customer site**
- Landing page with hero, About/Meet-the-team, work gallery, and treatments menu
- Mobile-first booking flow: treatment → technician → live date/time → details → confirmed
- WhatsApp contact button (works instantly via `wa.me` — no API needed)

**Admin backend** (`/admin`)
- Owner + staff logins with role-based access
- Dashboard, bookings management (cancel / complete / no-show, one-tap WhatsApp)
- Availability: weekly working hours (with split shifts) + time-off/holiday blocks
- Services CRUD, technician management (add/remove staff), business settings
- Message log of every automated message

**Scheduling engine**
- Availability computed from working hours − existing bookings − time-off − buffers
- **15-minute buffer either side** of every appointment (configurable)
- Configurable slot interval, minimum notice, and booking horizon
- Timezone-aware (Europe/London by default)

**WhatsApp automation** (integration-ready)
- Booking confirmation and cancellation fire inline
- 24-hour reminder and review request run on an hourly cron (idempotent)
- Runs in **stub mode** (messages composed + logged, not sent) until API
  credentials are added — then it's a single env-var switch to go live

---

## Tech stack

| Layer | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, TypeScript, React 19) |
| Styling | Tailwind CSS v4 + CSS design tokens |
| Database | Prisma ORM — SQLite locally, **Postgres (Supabase) in production** |
| Auth | Auth.js v5 (credentials, JWT sessions) |
| Messaging | WhatsApp Business Cloud API (pluggable provider) |
| Hosting | Vercel (+ Vercel Cron) |

---

## Local development

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env
#   - DATABASE_URL + DIRECT_URL: your Supabase connection strings (see below)
#   - AUTH_SECRET: openssl rand -base64 32

# 3. Create the schema + seed data on your database
npm run db:push         # creates all tables from the schema
npm run db:seed         # placeholder services, 2 technicians, sample bookings

# 4. Run
npm run dev             # http://localhost:3000
```

> The app targets Postgres (Supabase). For local development, point
> `DATABASE_URL`/`DIRECT_URL` at your Supabase project (or a separate free
> Supabase project kept for dev).

**Demo admin logins** (from the seed):
- Owner — `abigail@abigailnails.co.uk` / `abigail123`
- Staff — `sophie@abigailnails.co.uk` / `sophie123`

Handy scripts: `npm run db:studio` (browse data), `npm run db:reset` (wipe + reseed).

---

## Project structure

```
prisma/
  schema.prisma            # data model (Business, Technician, Service,
                           #   WorkingHours, TimeOff, Booking, User, MessageLog)
  seed.ts                  # placeholder content
src/
  app/
    page.tsx               # public landing page
    book/                  # booking flow
    admin/                 # admin backend ((app) route group is auth-guarded)
    api/
      availability/        # GET live availability
      bookings/            # POST create booking
      auth/[...nextauth]/  # Auth.js
      cron/dispatch/       # hourly scheduled-message runner
  components/site/         # public UI
  components/admin/        # admin UI
  components/booking/      # booking wizard
  lib/
    availability.ts        # the scheduling engine (pure)
    availability-service.ts# loads data + runs the engine
    booking-service.ts     # create-booking (server-side re-validation)
    messaging.ts           # composes messages, writes MessageLog
    whatsapp.ts            # provider abstraction (stub ↔ live)
    cron/dispatch.ts       # reminder + review dispatch
    admin/                 # session guards, queries, server actions
vercel.json                # cron schedule
```

---

## Going live

### 1. Create the database on Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → Database → Connection string**, copy both:
   - **Transaction pooler** (port 6543) → `DATABASE_URL` (add `?pgbouncer=true`)
   - **Direct connection** (port 5432) → `DIRECT_URL`
3. Put both in your local `.env`, then create the schema and seed it:
   ```bash
   npm run db:push         # creates all tables on Supabase
   npm run db:seed         # placeholder content + admin logins
   ```

Future schema changes: edit `prisma/schema.prisma` and re-run `npm run db:push`.

### 2. Deploy to Vercel

1. Push this repo to GitHub and import it at [vercel.com](https://vercel.com).
2. Add environment variables (Project → Settings → Environment Variables):

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Supabase pooled URI (6543, `?pgbouncer=true`) |
   | `DIRECT_URL` | Supabase direct URI (5432) |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `CRON_SECRET` | any long random string |
   | `NEXT_PUBLIC_SITE_URL` | your production URL |
   | `WHATSAPP_ENABLED` | `false` for now |

3. Deploy. `vercel.json` registers the hourly cron at `/api/cron/dispatch`;
   Vercel automatically calls it with `Authorization: Bearer <CRON_SECRET>`.

### 3. Turn on WhatsApp (when ready)

The three automated messages need the **WhatsApp Business Cloud API** — a Meta
Business account with a verified number and **pre-approved message templates**.
This approval is done in Meta Business Manager and takes a few days; nothing in
the code blocks on it.

Once approved:

1. Get your **Phone Number ID** and a permanent **Access Token** from the Meta
   app dashboard.
2. Set the env vars:
   ```
   WHATSAPP_ENABLED="true"
   WHATSAPP_PHONE_NUMBER_ID="..."
   WHATSAPP_ACCESS_TOKEN="..."
   WHATSAPP_API_VERSION="v21.0"
   ```
3. **Templates:** business-initiated messages sent outside the 24-hour customer
   service window must use an approved template. Map each message type to its
   template in `src/lib/whatsapp.ts` (the `template` parameter is already
   plumbed through). Suggested templates to create:
   - `booking_confirmation` — sent on booking
   - `appointment_reminder` — 24h before
   - `review_request` — after the appointment

Until then, every message is composed and visible in **Admin → Messages**
(stub mode), so you can see exactly what would be sent.

### 4. Customising content

All content is editable from **Admin → Settings** (brand, About, WhatsApp
number, colours, booking rules) and **Admin → Services / Technicians** — no code
changes needed. Replace the placeholder gallery images in
`src/components/site/GallerySection.tsx` with real photos when available.

---

## Booking rules (defaults)

| Rule | Default | Where to change |
|------|---------|-----------------|
| Buffer before / after | 15 min each | Admin → Settings |
| Slot interval | 15 min | Admin → Settings |
| Minimum notice | 12 hours | Admin → Settings |
| Booking horizon | 56 days (8 weeks) | Admin → Settings |
| Timezone | Europe/London | Admin → Settings |

---

_Built by Symplify Solutions._
