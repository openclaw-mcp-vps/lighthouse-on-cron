import { createHmac, timingSafeEqual } from "crypto";

export type LemonSubscriptionWebhook = {
  email: string;
  lemonSubscriptionId: string;
  status: "active" | "on_trial" | "paused" | "cancelled" | "expired" | "past_due";
  planLabel: string | null;
  currentPeriodEnd: string | null;
};

export async function initializeLemonSdk() {
  if (!process.env.LEMON_SQUEEZY_API_KEY) {
    return;
  }

  try {
    const sdk = await import("@lemonsqueezy/lemonsqueezy.js");
    (sdk as { lemonSqueezySetup?: (input: { apiKey: string; onError?: (error: unknown) => void }) => void }).
      lemonSqueezySetup?.({
      apiKey: process.env.LEMON_SQUEEZY_API_KEY,
      onError: (error) => {
        console.error("Lemon SDK setup error", error);
      }
    });
  } catch (error) {
    console.error("Unable to initialize Lemon Squeezy SDK", error);
  }
}

export function verifyLemonSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

function getStatusFromEvent(eventName: string, payloadStatus: string | null) {
  const normalizedEvent = eventName.toLowerCase();
  const normalizedPayloadStatus = (payloadStatus ?? "").toLowerCase();

  if (normalizedEvent.includes("cancelled") || normalizedPayloadStatus === "cancelled") {
    return "cancelled" as const;
  }
  if (normalizedEvent.includes("expired") || normalizedPayloadStatus === "expired") {
    return "expired" as const;
  }
  if (normalizedEvent.includes("paused") || normalizedPayloadStatus === "paused") {
    return "paused" as const;
  }
  if (normalizedPayloadStatus === "past_due") {
    return "past_due" as const;
  }
  if (normalizedPayloadStatus === "on_trial") {
    return "on_trial" as const;
  }

  return "active" as const;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function extractSubscriptionPayload(payload: unknown): LemonSubscriptionWebhook | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as {
    meta?: { event_name?: unknown; custom_data?: Record<string, unknown> };
    data?: { id?: unknown; attributes?: Record<string, unknown> };
  };

  const eventName = readString(body.meta?.event_name) ?? "unknown";
  const attributes = body.data?.attributes ?? {};

  const email =
    readString(attributes.user_email) ??
    readString(attributes.customer_email) ??
    readString(body.meta?.custom_data?.email) ??
    readString(body.meta?.custom_data?.user_email);

  const subscriptionId =
    readString(body.data?.id) ?? readString(attributes.subscription_id) ?? readString(attributes.order_id);

  if (!email || !subscriptionId) {
    return null;
  }

  const planLabel =
    readString(attributes.variant_name) ??
    readString(attributes.product_name) ??
    readString(body.meta?.custom_data?.plan);

  const currentPeriodEnd =
    readString(attributes.renews_at) ?? readString(attributes.ends_at) ?? readString(attributes.trial_ends_at);

  return {
    email: email.toLowerCase(),
    lemonSubscriptionId: subscriptionId,
    status: getStatusFromEvent(eventName, readString(attributes.status)),
    planLabel,
    currentPeriodEnd
  };
}
