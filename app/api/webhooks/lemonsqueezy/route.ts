import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  PlanType,
  SubscriberStatus,
  upsertSubscriber,
  updateSubscriberStatus,
  updateSubscriberStatusByCustomerId
} from "@/lib/db";

export const runtime = "nodejs";

function derivePlanFromAmount(amountTotal: number | null | undefined): PlanType {
  if (!amountTotal) {
    return "starter";
  }

  return amountTotal >= 2900 ? "agency" : "starter";
}

function toLocalStatus(stripeStatus: string | null | undefined): SubscriberStatus {
  if (!stripeStatus) {
    return "inactive";
  }

  if (stripeStatus === "active" || stripeStatus === "trialing") {
    return stripeStatus;
  }

  return "canceled";
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!signature || !webhookSecret || !stripeSecretKey) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration." }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook signature verification failed."
      },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_details?.email ?? session.customer_email;

        if (email) {
          upsertSubscriber({
            email,
            status: "active",
            plan: derivePlanFromAmount(session.amount_total),
            stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
            stripeSubscriptionId:
              typeof session.subscription === "string" ? session.subscription : null
          });
        }

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

        if (customerId) {
          updateSubscriberStatusByCustomerId(customerId, toLocalStatus(subscription.status));
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

        if (customerId) {
          updateSubscriberStatusByCustomerId(customerId, "inactive");
        }

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

        if (customerId) {
          updateSubscriberStatusByCustomerId(customerId, "active");
        } else if (invoice.customer_email) {
          updateSubscriberStatus(invoice.customer_email, "active");
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook processing failed."
      },
      { status: 500 }
    );
  }
}
