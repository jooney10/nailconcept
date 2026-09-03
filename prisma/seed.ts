import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// All content here is placeholder — realistic values Abigail can swap from the
// admin screens (or the client can hand over her real Timely list). Prices are
// in pence.

const HOUR = 60;

async function main() {
  // Clear existing data (dev seed is destructive and repeatable).
  await prisma.messageLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.timeOff.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  // ---- Business config ----------------------------------------------------
  await prisma.business.upsert({
    where: { id: "business" },
    update: {},
    create: {
      id: "business",
      name: "Abigail Nails",
      tagline: "Home-based nail studio in Stokenchurch",
      aboutHeading: "Meet Abigail",
      aboutBody:
        "Hi, I'm Abigail — a home-based nail technician working from my calm little studio in Stokenchurch, Buckinghamshire. I've been shaping, painting and pampering nails for years, and I specialise in long-lasting BIAB overlays and gel work. I keep my space relaxed and unhurried, so every appointment feels like a proper bit of me-time. Can't wait to get you booked in!",
      whatsappNumber: "447700900123", // placeholder UK number, E.164 without +
      email: "hello@abigailnails.co.uk",
      addressLine: "Stokenchurch, Buckinghamshire (full address shared on booking)",
      instagram: "abigaillnails",
      colorPrimary: "#c9716b",
      colorAccent: "#c9a25a",
      timezone: "Europe/London",
    },
  });

  // ---- Users (admin logins) ----------------------------------------------
  const ownerPassword = await bcrypt.hash("abigail123", 10);
  const staffPassword = await bcrypt.hash("sophie123", 10);

  const owner = await prisma.user.create({
    data: {
      email: "abigail@abigailnails.co.uk",
      passwordHash: ownerPassword,
      role: "OWNER",
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: "sophie@abigailnails.co.uk",
      passwordHash: staffPassword,
      role: "STAFF",
    },
  });

  // ---- Services -----------------------------------------------------------
  const services = await Promise.all(
    [
      {
        name: "BIAB Overlay",
        description:
          "Builder-in-a-bottle overlay on natural nails — strength and a glossy finish that lasts.",
        durationMin: 75,
        pricePence: 4500,
        category: "Nails",
        displayOrder: 1,
      },
      {
        name: "BIAB Infill",
        description: "Top-up and rebalance of an existing BIAB set.",
        durationMin: 60,
        pricePence: 3800,
        category: "Nails",
        displayOrder: 2,
      },
      {
        name: "Gel Manicure",
        description: "Shape, cuticle tidy and a long-wear gel colour of your choice.",
        durationMin: 45,
        pricePence: 3000,
        category: "Nails",
        displayOrder: 3,
      },
      {
        name: "Gel Pedicure",
        description: "Foot soak, shaping and gel colour to keep toes looking lovely.",
        durationMin: 45,
        pricePence: 3500,
        category: "Nails",
        displayOrder: 4,
      },
      {
        name: "Soak Off + Redo",
        description: "Removal of your current set plus a fresh application in one sitting.",
        durationMin: 90,
        pricePence: 4500,
        category: "Nails",
        displayOrder: 5,
      },
      {
        name: "Soak Off Only",
        description: "Gentle removal of gel or BIAB, leaving nails clean and cared for.",
        durationMin: 30,
        pricePence: 1200,
        category: "Nails",
        displayOrder: 6,
      },
      {
        name: "Nail Art (add-on)",
        description: "Add a little sparkle — chrome, freehand art or gems on top of your set.",
        durationMin: 30,
        pricePence: 800,
        category: "Add-on",
        displayOrder: 7,
      },
      {
        name: "Luxury Facial",
        description: "Coming soon once Abigail qualifies — register your interest on WhatsApp.",
        durationMin: 60,
        pricePence: 0,
        priceText: "Coming soon",
        category: "Coming Soon",
        active: false,
        displayOrder: 8,
      },
    ].map((s) => prisma.service.create({ data: s })),
  );

  const bookableServices = services.filter((s) => s.active);

  // ---- Technicians --------------------------------------------------------
  const abigail = await prisma.technician.create({
    data: {
      name: "Abigail",
      slug: "abigail",
      bio: "Owner & lead technician. BIAB and gel specialist.",
      active: true,
      displayOrder: 1,
      userId: owner.id,
      services: { connect: bookableServices.map((s) => ({ id: s.id })) },
    },
  });

  const sophie = await prisma.technician.create({
    data: {
      name: "Sophie",
      slug: "sophie",
      bio: "Part-time technician, midweek appointments.",
      active: true,
      displayOrder: 2,
      userId: staff.id,
      // Sophie offers a subset (no pedicures) — demonstrates per-tech services.
      services: {
        connect: bookableServices
          .filter((s) => s.name !== "Gel Pedicure")
          .map((s) => ({ id: s.id })),
      },
    },
  });

  // ---- Working hours ------------------------------------------------------
  // Abigail: Tue–Sat, split shift 09:00–13:00 and 14:00–18:00.
  const abigailBlocks: { weekday: number; startMinute: number; endMinute: number }[] = [];
  for (const weekday of [2, 3, 4, 5, 6]) {
    abigailBlocks.push({ weekday, startMinute: 9 * HOUR, endMinute: 13 * HOUR });
    abigailBlocks.push({ weekday, startMinute: 14 * HOUR, endMinute: 18 * HOUR });
  }
  await prisma.workingHours.createMany({
    data: abigailBlocks.map((b) => ({ ...b, technicianId: abigail.id })),
  });

  // Sophie: Wed/Thu/Fri, single block 10:00–16:00.
  await prisma.workingHours.createMany({
    data: [3, 4, 5].map((weekday) => ({
      technicianId: sophie.id,
      weekday,
      startMinute: 10 * HOUR,
      endMinute: 16 * HOUR,
    })),
  });

  // ---- A couple of sample bookings ---------------------------------------
  const biab = bookableServices.find((s) => s.name === "BIAB Overlay")!;
  const gelMani = bookableServices.find((s) => s.name === "Gel Manicure")!;

  // Next occurrence of a given weekday at a given hour (local-ish; fine for seed).
  function nextWeekdayAt(weekday: number, hour: number, minute = 0) {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(minute);
    d.setHours(hour);
    const diff = (weekday - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  const b1Start = nextWeekdayAt(4, 10, 0); // next Thursday 10:00
  const b1End = new Date(b1Start.getTime() + biab.durationMin * 60000);
  await prisma.booking.create({
    data: {
      reference: "AB-7K2Q",
      technicianId: abigail.id,
      serviceId: biab.id,
      customerName: "Jessica Hart",
      customerPhone: "447700900456",
      startAt: b1Start,
      endAt: b1End,
      status: "CONFIRMED",
    },
  });

  const b2Start = nextWeekdayAt(6, 11, 30); // next Saturday 11:30
  const b2End = new Date(b2Start.getTime() + gelMani.durationMin * 60000);
  await prisma.booking.create({
    data: {
      reference: "AB-3M9X",
      technicianId: abigail.id,
      serviceId: gelMani.id,
      customerName: "Priya Shah",
      customerPhone: "447700900789",
      startAt: b2Start,
      endAt: b2End,
      status: "CONFIRMED",
    },
  });

  console.log("Seed complete:");
  console.log("  Owner login: abigail@abigailnails.co.uk / abigail123");
  console.log("  Staff login: sophie@abigailnails.co.uk / sophie123");
  console.log(`  ${services.length} services, 2 technicians, 2 sample bookings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
