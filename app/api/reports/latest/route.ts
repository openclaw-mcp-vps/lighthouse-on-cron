import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import { getLatestReportRows, getSubscriber, isSubscriberActive } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const session = verifyAccessToken(token);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriber = getSubscriber(session.email);
  if (!subscriber || !isSubscriberActive(subscriber.status)) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  const rows = getLatestReportRows(session.email);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    rows
  });
}
