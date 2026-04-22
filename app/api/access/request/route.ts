import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { sendAccessCodeEmail } from "@/lib/email";
import { getSubscriber, isSubscriberActive, saveLoginCode } from "@/lib/db";

const requestSchema = z.object({
  email: z.string().email()
});

function createCode() {
  return randomInt(100000, 999999).toString();
}

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const email = payload.email.trim().toLowerCase();

    const subscriber = getSubscriber(email);
    if (!subscriber || !isSubscriberActive(subscriber.status)) {
      return NextResponse.json(
        {
          error: "No active subscription found for that email. Complete checkout first, then retry."
        },
        { status: 403 }
      );
    }

    const code = createCode();
    saveLoginCode(email, code);

    const delivery = await sendAccessCodeEmail({ email, code });

    return NextResponse.json({
      message: "Access code sent. It expires in 15 minutes.",
      devCode: "devCode" in delivery ? delivery.devCode : undefined
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not request access code."
      },
      { status: 500 }
    );
  }
}
