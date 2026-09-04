import { NextRequest, NextResponse } from "next/server";
import { handleInboundReply } from "@/lib/reschedule";

export const dynamic = "force-dynamic";

// WhatsApp Business Cloud API webhook.
//
// GET  — verification handshake (Meta calls this once when you set the webhook).
// POST — inbound messages. When a customer replies to a reschedule request with
//        "yes", their booking is confirmed automatically.
//
// This only receives real traffic once the WhatsApp API is live and this URL is
// registered in the Meta app dashboard with WHATSAPP_VERIFY_TOKEN.

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

interface WhatsAppInbound {
  entry?: {
    changes?: {
      value?: {
        messages?: { from?: string; text?: { body?: string }; type?: string }[];
      };
    }[];
  }[];
}

export async function POST(req: NextRequest) {
  let payload: WhatsAppInbound;
  try {
    payload = (await req.json()) as WhatsAppInbound;
  } catch {
    return NextResponse.json({ received: true });
  }

  const messages =
    payload.entry?.flatMap(
      (e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? [],
    ) ?? [];

  for (const msg of messages) {
    const from = msg.from;
    const body = msg.text?.body;
    if (!from || !body) continue;
    try {
      await handleInboundReply(from, body);
    } catch (err) {
      console.error("Inbound reply handling failed:", err);
    }
  }

  // WhatsApp expects a fast 200 to avoid retries.
  return NextResponse.json({ received: true });
}
