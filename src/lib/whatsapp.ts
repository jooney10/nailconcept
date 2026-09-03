import type { MessageStatus } from "@/lib/enums";

// ---------------------------------------------------------------------------
// WhatsApp provider abstraction.
//
// The rest of the app calls sendWhatsApp() and never touches provider details.
// When WHATSAPP_ENABLED !== "true" (the default), it runs in STUB mode: nothing
// is actually sent, and the caller records the composed body in the MessageLog.
// Set the env vars (see README) to switch on the live Meta WhatsApp Cloud API —
// no code changes required.
//
// NOTE on templates: business-initiated messages sent outside the 24-hour
// customer service window must use a pre-approved message template. Free-text
// sends only succeed inside that window. Map each MessageType to an approved
// template name at go-live (see README > WhatsApp go-live).
// ---------------------------------------------------------------------------

export interface SendResult {
  status: MessageStatus;
  providerId?: string;
  error?: string;
}

export interface SendParams {
  to: string; // E.164 digits, no "+"
  body: string;
  /** Optional approved template for out-of-window sends. */
  template?: { name: string; languageCode?: string; components?: unknown[] };
}

function isEnabled(): boolean {
  return process.env.WHATSAPP_ENABLED === "true";
}

export async function sendWhatsApp(params: SendParams): Promise<SendResult> {
  const { to, body, template } = params;

  if (!isEnabled()) {
    // Stub mode — composed but not sent.
    return { status: "STUBBED" };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";

  if (!phoneNumberId || !token) {
    return {
      status: "FAILED",
      error: "WHATSAPP_ENABLED is true but PHONE_NUMBER_ID / ACCESS_TOKEN are missing.",
    };
  }

  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
  const payload = template
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.languageCode || "en_GB" },
          ...(template.components ? { components: template.components } : {}),
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        status: "FAILED",
        error: data?.error?.message || `HTTP ${res.status}`,
      };
    }
    return { status: "SENT", providerId: data?.messages?.[0]?.id };
  } catch (err) {
    return {
      status: "FAILED",
      error: err instanceof Error ? err.message : "Unknown send error",
    };
  }
}
