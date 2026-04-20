import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccessFromRequest } from "@/lib/auth";
import { addTrackedUrlByEmail, getUrlLimitForEmail, listTrackedUrlsByEmail, removeTrackedUrlByEmail } from "@/lib/db";

const addSchema = z.object({
  url: z.string().min(4)
});

const removeSchema = z.object({
  id: z.number().int().positive()
});

export async function GET(request: NextRequest) {
  const access = getAccessFromRequest(request);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [items, limit] = await Promise.all([
      listTrackedUrlsByEmail(access.email),
      getUrlLimitForEmail(access.email)
    ]);

    return NextResponse.json({ items, limit });
  } catch {
    return NextResponse.json({ error: "Failed to read URLs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = getAccessFromRequest(request);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const item = await addTrackedUrlByEmail(access.email, parsed.data.url);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add URL";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = getAccessFromRequest(request);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = removeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "URL id is required" }, { status: 400 });
  }

  try {
    const ok = await removeTrackedUrlByEmail(access.email, parsed.data.id);
    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ error: "Failed to remove URL" }, { status: 500 });
  }
}
