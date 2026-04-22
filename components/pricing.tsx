import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    price: "$9",
    cadence: "/month",
    description: "For founders who need weekly coverage across their key money pages.",
    features: [
      "Up to 10 URLs",
      "Weekly Sunday Lighthouse runs",
      "Regression alerts vs last week",
      "Email report + dashboard history"
    ]
  },
  {
    name: "Agency",
    price: "$29",
    cadence: "/month",
    description: "For operators tracking full sites and client portfolios at scale.",
    features: [
      "Unlimited URLs",
      "Portfolio-wide weekly reporting",
      "Fast regression triage",
      "Priority support turnaround"
    ]
  }
];

export function Pricing({ compact = false }: { compact?: boolean }) {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string;

  return (
    <section className={compact ? "" : "py-16"} id="pricing">
      {!compact ? (
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <Badge className="mb-4">Pricing</Badge>
          <h2 className="text-3xl font-bold text-zinc-50 sm:text-4xl">Simple monthly pricing</h2>
          <p className="mt-3 text-zinc-400">
            Run audits automatically, catch regressions early, and stop spending Sundays in DevTools.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.name} className="relative overflow-hidden">
            {plan.name === "Agency" ? (
              <div className="absolute right-4 top-4 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                Best for teams
              </div>
            ) : null}
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-3xl font-bold text-zinc-100">
                {plan.price}
                <span className="text-base font-medium text-zinc-400">{plan.cadence}</span>
              </p>
              <ul className="space-y-2 text-sm text-zinc-300">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <a
                href={paymentLink}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-blue-500 px-4 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Start with Stripe Checkout
              </a>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
