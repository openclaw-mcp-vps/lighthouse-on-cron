import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE_NAME, createAccessToken } from "@/lib/access";
import { findActiveSubscriptionByEmail } from "@/lib/db";

const bodySchema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  let subscription;
  try {
    subscription = await findActiveSubscriptionByEmail(parsed.data.email);
  } catch {
    return NextResponse.json({ error: "Database unavailable. Configure DATABASE_URL." }, { status: 500 });
  }

  if (!subscription?.active) {
    return NextResponse.json(
      {
        error: "No active subscription found for this email. Use the same email from checkout."
      },
      { status: 403 }
    );
  }

  const token = createAccessToken(subscription.email, subscription.plan);
  const response = NextResponse.json({ ok: true, plan: subscription.plan });

  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
