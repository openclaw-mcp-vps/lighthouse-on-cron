import { NextRequest, NextResponse } from "next/server";
import { requireSubscribedUser } from "@/lib/auth";
import { removeMonitoredUrl } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const user = await requireSubscribedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const urlId = Number(params.id);
    if (!Number.isFinite(urlId)) {
      return NextResponse.json({ error: "Invalid URL id." }, { status: 400 });
    }

    await removeMonitoredUrl(user.id, urlId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
