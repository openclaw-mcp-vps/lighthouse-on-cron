import { NextResponse } from "next/server";
import { z } from "zod";

import { ACCESS_COOKIE_NAME, createAccessToken } from "@/lib/auth";
import { getSubscriber, isSubscriberActive, verifyLoginCode } from "@/lib/db";

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6)
});

export async function POST(request: Request) {
  try {
    const payload = verifySchema.parse(await request.json());
    const email = payload.email.trim().toLowerCase();

    const subscriber = getSubscriber(email);
    if (!subscriber || !isSubscriberActive(subscriber.status)) {
      return NextResponse.json(
        {
          error: "No active subscription found for that email."
        },
        { status: 403 }
      );
    }

    const valid = verifyLoginCode(email, payload.code.trim());
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
    }

    const token = createAccessToken(email);
    const response = NextResponse.json({ message: "Dashboard unlocked." });

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Please provide a valid email and 6-digit code."
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not verify access code."
      },
      { status: 500 }
    );
  }
}
