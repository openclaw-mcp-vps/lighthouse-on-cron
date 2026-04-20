import { NextRequest, NextResponse } from "next/server";
import { extractSubscriptionPayload, initializeLemonSdk, verifyLemonSignature } from "@/lib/lemon";
import { upsertSubscriptionFromWebhook } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "LEMON_SQUEEZY_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as unknown;
  await initializeLemonSdk();
  const subscription = extractSubscriptionPayload(payload);

  if (!subscription) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    await upsertSubscriptionFromWebhook(subscription);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook processing failed", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
