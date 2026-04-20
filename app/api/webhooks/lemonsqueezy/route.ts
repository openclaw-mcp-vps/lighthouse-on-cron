import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { inferPlan, upsertSubscriptionFromWebhook } from "@/lib/db";
import { sendAccessUnlockedEmail } from "@/lib/email";
import { setupLemonSqueezy } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

type LemonPayload = {
  meta?: {
    event_name?: string;
    custom_data?: {
      email?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: Record<string, unknown>;
  };
};

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function verifySignature(rawBody: string, signature: string, secret: string) {
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function inferSubscriptionStatus(eventName: string, payloadStatus?: string) {
  if (eventName === "order_created") return "active";
  if (eventName === "subscription_created") return payloadStatus ?? "active";
  if (eventName === "subscription_updated") return payloadStatus ?? "active";
  if (eventName === "subscription_resumed") return "active";
  if (eventName === "subscription_cancelled") return "inactive";
  if (eventName === "subscription_expired") return "inactive";
  if (eventName === "subscription_paused") return "inactive";
  return payloadStatus ?? "inactive";
}

export async function POST(request: NextRequest) {
  setupLemonSqueezy();

  const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing LEMON_SQUEEZY_WEBHOOK_SECRET." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing webhook signature." }, { status: 401 });
  }

  try {
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid signature format." }, { status: 401 });
  }

  let payload: LemonPayload;
  try {
    payload = JSON.parse(rawBody) as LemonPayload;
  } catch {
    return NextResponse.json({ error: "Malformed webhook payload." }, { status: 400 });
  }

  try {
    const eventName = payload.meta?.event_name ?? "";
    const attributes = payload.data?.attributes ?? {};

    const email =
      getString(attributes.user_email) ??
      getString(attributes.customer_email) ??
      getString(attributes.email) ??
      getString(payload.meta?.custom_data?.email);

    if (!email) {
      return NextResponse.json({ ignored: true, reason: "No email present in webhook payload." });
    }

    const variantName =
      getString(attributes.variant_name) ??
      getString(attributes.product_name) ??
      getString(attributes.first_order_item_name);

    const user = await upsertSubscriptionFromWebhook({
      email,
      plan: inferPlan(variantName),
      subscriptionStatus: inferSubscriptionStatus(eventName, getString(attributes.status)),
      lemonCustomerId: getString(attributes.customer_id),
      lemonSubscriptionId: getString(payload.data?.id)
    });

    if (user.subscription_status === "active" || user.subscription_status === "on_trial" || user.subscription_status === "paid") {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://lighthouse-on-cron.com"}/dashboard`;
      await sendAccessUnlockedEmail({
        to: user.email,
        dashboardUrl
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook processing error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
