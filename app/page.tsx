import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Globe2,
  MailCheck,
  Rocket,
  ShieldCheck,
  TrendingDown
} from "lucide-react";
import { CheckoutButton } from "@/components/checkout-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "How does the weekly report work?",
    answer:
      "Every Sunday we run Lighthouse on each URL in your account, compare scores against the previous run, and email a summary with category-by-category deltas."
  },
  {
    question: "What counts as a regression alert?",
    answer:
      "A regression alert fires when a score category drops by 5+ points week-over-week. Alerts include the previous score, current score, and exact delta."
  },
  {
    question: "Can I monitor staging URLs?",
    answer:
      "Yes. You can track production, staging, or campaign pages as long as Lighthouse can access the URL without authentication."
  },
  {
    question: "Do agencies get one account for multiple clients?",
    answer:
      "Yes. The Unlimited plan is built for agencies managing many client pages and campaign landing pages."
  }
];

const problems = [
  "Manual Lighthouse checks get skipped the moment product work gets busy.",
  "Performance drops hide in plugin updates, new scripts, and CMS edits.",
  "By the time rankings fall, root-cause analysis takes days instead of minutes."
];

const outcomes = [
  {
    title: "Automated weekly audits",
    description: "Sunday cron jobs run Lighthouse on every tracked URL, no manual work needed.",
    icon: Gauge
  },
  {
    title: "Regression alerts",
    description: "Immediate week-over-week deltas for performance, accessibility, SEO, and best-practices.",
    icon: TrendingDown
  },
  {
    title: "Inbox-first reporting",
    description: "Action-ready summary lands in your inbox with highlights, declines, and recovery opportunities.",
    icon: MailCheck
  }
];

export default function HomePage() {
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
  const checkoutUrl = productId
    ? `https://app.lemonsqueezy.com/checkout/buy/${productId}`
    : "https://app.lemonsqueezy.com/checkout";

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <header className="mb-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-[#2f81f7]/20 p-2 text-[#58a6ff]">
            <Rocket className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-[#e6edf3]">Lighthouse on Cron</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "secondary" }), "h-9 px-3 text-xs sm:text-sm")}
          >
            Dashboard
          </Link>
          <CheckoutButton href={checkoutUrl} label="Start Monitoring" className="h-9 px-3 text-xs sm:text-sm" />
        </div>
      </header>

      <section className="mb-16 rounded-2xl border border-[#30363d] bg-gradient-to-br from-[#161b22] via-[#0f1623] to-[#161b22] p-8 sm:p-12">
        <Badge className="mb-4">Weekly Core Web Vitals guardrail</Badge>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-[#f0f6fc] sm:text-5xl">
          Lighthouse on Cron: weekly Core Web Vitals reports for every URL you care about.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#8b949e] sm:text-lg">
          Paste URLs or connect your domain list. Every Sunday, you receive Lighthouse scores for performance,
          accessibility, SEO, and best-practices plus regression alerts versus last week.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <CheckoutButton href={checkoutUrl} label="Unlock Weekly Reports" className="justify-center" />
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-center")}>
            View Product Demo
          </Link>
        </div>
        <div className="mt-8 grid gap-4 text-sm text-[#8b949e] sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#3fb950]" />
            Sunday automated audits
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#3fb950]" />
            Regression alerts in email
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#3fb950]" />
            Built for indie founders + agencies
          </div>
        </div>
      </section>

      <section className="mb-16 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#f0f6fc]">
              <AlertTriangle className="h-5 w-5 text-[#f85149]" />
              The expensive problem
            </CardTitle>
            <CardDescription>
              Google tracks top websites continuously. Smaller teams still rely on manual audits and missed signals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-[#8b949e]">
              {problems.map((problem) => (
                <li key={problem} className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[#f85149]" />
                  <span>{problem}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#f0f6fc]">
              <ShieldCheck className="h-5 w-5 text-[#58a6ff]" />
              What changes with Lighthouse on Cron
            </CardTitle>
            <CardDescription>
              One lightweight workflow: add URLs once, then act only when data tells you to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {outcomes.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-lg border border-[#30363d] bg-[#0d1117] p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#e6edf3]">
                    <Icon className="h-4 w-4 text-[#58a6ff]" />
                    {item.title}
                  </div>
                  <p className="text-sm text-[#8b949e]">{item.description}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="mb-16">
        <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#58a6ff]">
          <Globe2 className="h-4 w-4" />
          Pricing
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="relative overflow-hidden">
            <CardHeader>
              <CardTitle className="text-[#f0f6fc]">Starter</CardTitle>
              <CardDescription>For solo founders and focused projects.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-4xl font-bold text-[#f0f6fc]">
                $9<span className="text-lg font-medium text-[#8b949e]">/mo</span>
              </p>
              <ul className="space-y-2 text-sm text-[#8b949e]">
                <li>Monitor up to 10 URLs</li>
                <li>Weekly Sunday reports</li>
                <li>Regression alerts vs last week</li>
                <li>Email support</li>
              </ul>
              <CheckoutButton href={checkoutUrl} label="Choose Starter" className="mt-6 w-full justify-center" />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-[#2f81f7]">
            <div className="absolute right-4 top-4 rounded-full bg-[#2f81f7] px-2 py-1 text-xs font-semibold text-white">
              Agencies
            </div>
            <CardHeader>
              <CardTitle className="text-[#f0f6fc]">Unlimited</CardTitle>
              <CardDescription>For SEO consultants and client portfolios.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-4xl font-bold text-[#f0f6fc]">
                $29<span className="text-lg font-medium text-[#8b949e]">/mo</span>
              </p>
              <ul className="space-y-2 text-sm text-[#8b949e]">
                <li>Unlimited tracked URLs</li>
                <li>Portfolio-wide weekly digest</li>
                <li>Priority regression flagging</li>
                <li>Priority email support</li>
              </ul>
              <CheckoutButton href={checkoutUrl} label="Choose Unlimited" className="mt-6 w-full justify-center" />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold text-[#f0f6fc]">FAQ</h2>
        <div className="space-y-4">
          {faqs.map((item) => (
            <Card key={item.question}>
              <CardHeader>
                <CardTitle className="text-base text-[#f0f6fc]">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-[#8b949e]">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 text-sm text-[#8b949e]">
        Lighthouse on Cron helps smaller teams get enterprise-grade monitoring without enterprise complexity.
      </footer>
    </main>
  );
}
