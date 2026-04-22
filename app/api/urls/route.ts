import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import {
  addMonitoredUrl,
  getSubscriber,
  isSubscriberActive,
  listMonitoredUrls,
  removeMonitoredUrl
} from "@/lib/db";

const addSchema = z.object({
  url: z.string().min(4)
});

const deleteSchema = z.object({
  id: z.number().int().positive()
});

function getAuthorizedEmail(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const session = verifyAccessToken(token);
  if (!session) {
    return null;
  }
  return session.email;
}

function resolveLimit(plan: string | undefined) {
  if (plan === "agency") {
    return null;
  }
  return 10;
}

export async function GET(request: NextRequest) {
  const email = getAuthorizedEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriber = getSubscriber(email);
  if (!subscriber || !isSubscriberActive(subscriber.status)) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  const urls = listMonitoredUrls(email);
  return NextResponse.json({
    urls,
    count: urls.length,
    limit: resolveLimit(subscriber.plan)
  });
}

export async function POST(request: NextRequest) {
  const email = getAuthorizedEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = addSchema.parse(await request.json());
    const urls = addMonitoredUrl(email, payload.url);
    const subscriber = getSubscriber(email);

    return NextResponse.json({
      urls,
      count: urls.length,
      limit: resolveLimit(subscriber?.plan)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A valid URL is required." }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not add URL"
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const email = getAuthorizedEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = deleteSchema.parse(await request.json());
    const urls = removeMonitoredUrl(email, payload.id);
    const subscriber = getSubscriber(email);

    return NextResponse.json({
      urls,
      count: urls.length,
      limit: resolveLimit(subscriber?.plan)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A valid URL id is required." }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not delete URL"
      },
      { status: 400 }
    );
  }
}
