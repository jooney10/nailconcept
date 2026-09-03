import { NextRequest, NextResponse } from "next/server";
import { dispatchScheduledMessages } from "@/lib/cron/dispatch";

export const dynamic = "force-dynamic";

// Hourly cron endpoint (see vercel.json). Protected by CRON_SECRET: Vercel Cron
// automatically sends `Authorization: Bearer <CRON_SECRET>`. For manual testing
// you can also pass ?secret=<CRON_SECRET>.
function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

async function handle(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const summary = await dispatchScheduledMessages();
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
