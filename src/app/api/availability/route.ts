import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAvailability } from "@/lib/availability-service";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  serviceId: z.string().min(1),
  technicianId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    serviceId: req.nextUrl.searchParams.get("serviceId") ?? "",
    technicianId: req.nextUrl.searchParams.get("technicianId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await getAvailability(parsed.data);
  if (!result) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
