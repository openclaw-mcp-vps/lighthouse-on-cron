import Link from "next/link";

import { Pricing } from "@/components/pricing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const painPoints = [
  "Manual Lighthouse checks happen only when something already broke.",
  "SEO and conversion regressions hide in page-level changes for weeks.",
  "Agencies lose hours collecting screenshots and writing Monday update emails."
];

const outcomes = [
  "Weekly Sunday audits for every tracked URL",
  "Email summary with perf, a11y, SEO, and best-practices deltas",
  "Regression alerts when scores dip vs last week",
  "Dashboard timeline that highlights where to fix first"
];

const faqs = [
  {
    question: "How does billing work?",
    answer:
      "Billing runs through Stripe hosted checkout. Subscribe once, and your weekly reports start automatically from the next Sunday run."
  },
  {
    question: "What counts as a regression alert?",
    answer:
      "By default, a drop of 5+ points in any Lighthouse category is flagged so you can investigate before rankings or conversions slide."
  },
  {
    question: "Can agencies monitor multiple client sites?",
    answer:
      "Yes. The Agency plan is designed for unlimited URLs, making it practical for multi-client SEO and performance operations."
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No browser extension or plugin needed. Add your URLs once, then reviews and alerts are delivered automatically each week."
  }
];

export default function HomePage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-widest text-zinc-300">
          LIGHTHOUSE ON CRON
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-400">
          <a href="#pricing" className="hover:text-zinc-200">
            Pricing
          </a>
          <a href="#faq" className="hover:text-zinc-200">
            FAQ
          </a>
          <Link href="/dashboard" className="hover:text-zinc-200">
            Dashboard
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="pointer-events-none absolute -right-16 top-8 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <Badge className="mb-5">Built for SEO-focused founders and agencies</Badge>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight text-zinc-50 sm:text-6xl">
          Lighthouse on Cron — weekly Core Web Vitals reports for all your URLs
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-zinc-300">
          Paste your URLs once. Every Sunday, get an email with Lighthouse scores for performance,
          accessibility, SEO, and best practices, plus clear regression alerts against last week.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={paymentLink}
            className="inline-flex h-11 items-center justify-center rounded-md bg-blue-500 px-6 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            Start monitoring with Stripe Checkout
          </a>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-700 px-6 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900"
          >
            See dashboard flow
          </Link>
        </div>
      </section>

      <section className="grid gap-6 py-10 md:grid-cols-3">
        {painPoints.map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle className="text-lg">The problem</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-300">{item}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="py-12">
        <div className="mb-8 max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-50">What you get every week</h2>
          <p className="mt-3 text-zinc-400">
            Google does this kind of monitoring for top sites. Lighthouse on Cron gives smaller teams the
            same continuous visibility for a fraction of the cost.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {outcomes.map((item) => (
            <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-5 text-zinc-200">
              {item}
            </div>
          ))}
        </div>
      </section>

      <Pricing />

      <section id="faq" className="py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-zinc-50">FAQ</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader>
                <CardTitle className="text-lg">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-300">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
        <h3 className="text-2xl font-bold text-zinc-50">Stop guessing if your site got slower this week</h3>
        <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
          For $9/month, Lighthouse on Cron gives you a repeatable performance workflow instead of a manual chore.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={paymentLink}
            className="inline-flex h-11 items-center justify-center rounded-md bg-blue-500 px-6 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            Start now
          </a>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-700 px-6 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900"
          >
            Open dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
