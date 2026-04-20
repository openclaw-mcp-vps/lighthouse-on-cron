import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, verifyPurchasedEmailAndIssueToken } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const tokenResult = await verifyPurchasedEmailAndIssueToken(email);
    if (!tokenResult) {
      return NextResponse.json(
        { error: "No active subscription found for that email. Complete checkout first." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: tokenResult.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: tokenResult.expiresAt,
      path: "/"
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
