import { NextRequest, NextResponse } from "next/server";
import { requireSubscribedUser } from "@/lib/auth";
import { addMonitoredUrl, listMonitoredUrls } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSubscribedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urls = await listMonitoredUrls(user.id);
    return NextResponse.json({ urls });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSubscribedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { url?: string };
    if (!body.url) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    const url = await addMonitoredUrl(user.id, body.url);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
