import Link from "next/link";
import { Bolt, ChartNoAxesColumnIncreasing, Mail, Search, ShieldAlert } from "lucide-react";
import { Pricing } from "@/components/pricing";

const faq = [
  {
    question: "How often do audits run?",
    answer:
      "Every active URL is audited each Sunday in mobile mode. You get one consolidated email with score changes and regression alerts compared to the previous run."
  },
  {
    question: "What counts as a regression alert?",
    answer:
      "A metric drop of 5 or more points in performance, accessibility, SEO, or best practices triggers an alert in your dashboard and weekly email."
  },
  {
    question: "Can I track client domains on one account?",
    answer:
      "Yes. Agencies typically choose Unlimited to track landing pages and core templates for each client domain without URL caps."
  },
  {
    question: "Do I need to install anything on my site?",
    answer:
      "No script and no plugin. We run Lighthouse remotely on the URLs you add and store historical scores for trend monitoring."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 md:px-8">
      <header className="reveal-up rounded-2xl border border-[#2f3947] bg-[#111826cc] p-6 md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2ea04366] bg-[#2ea0431f] px-3 py-1 text-xs font-semibold text-[#8ae2a0]">
          <Bolt size={14} />
          Lighthouse on Cron
        </div>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
          Weekly Core Web Vitals reports for all your URLs
        </h1>
        <p className="mt-4 max-w-3xl text-base text-muted md:text-lg">
          Paste URLs or connect domains. Every Sunday you get Lighthouse scores for performance, accessibility, SEO, and
          best practices, plus alerts when scores regress vs last week.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href="#pricing"
            className="rounded-xl bg-[#2ea043] px-5 py-2.5 text-sm font-semibold text-[#04110a] transition hover:bg-[#3fb950]"
          >
            Start for $9/mo
          </a>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[#2f3947] px-5 py-2.5 text-sm font-semibold text-[#f0f6fc] transition hover:bg-[#161b22]"
          >
            Open dashboard
          </Link>
        </div>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <article className="panel p-5">
          <div className="mb-3 inline-flex rounded-lg bg-[#f8514922] p-2 text-[#fda8a3]">
            <ShieldAlert size={18} />
          </div>
          <h2 className="text-lg font-semibold">The problem</h2>
          <p className="mt-2 text-sm text-muted">
            Manual Lighthouse checks get skipped. Regressions slip through after content edits, app updates, or plugin installs.
          </p>
        </article>
        <article className="panel p-5">
          <div className="mb-3 inline-flex rounded-lg bg-[#d2992222] p-2 text-[#f2cc60]">
            <Search size={18} />
          </div>
          <h2 className="text-lg font-semibold">The opportunity</h2>
          <p className="mt-2 text-sm text-muted">
            Faster pages rank and convert better. Weekly audits catch drops before they become SEO losses or checkout friction.
          </p>
        </article>
        <article className="panel p-5">
          <div className="mb-3 inline-flex rounded-lg bg-[#2ea04322] p-2 text-[#8ae2a0]">
            <Mail size={18} />
          </div>
          <h2 className="text-lg font-semibold">The workflow</h2>
          <p className="mt-2 text-sm text-muted">
            Add URLs once. We run every Sunday and email a concise report with score changes, regressions, and priorities.
          </p>
        </article>
      </section>

      <section className="mt-14 panel p-6 md:p-8">
        <h2 className="text-2xl font-semibold">Why people pay for this</h2>
        <p className="mt-3 max-w-3xl text-muted">
          Google tracks top sites at scale, but indie products and agency client pages are left to manual checks. At $9/month,
          automating Lighthouse with regression alerts removes a recurring chore and prevents expensive blind spots.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#2f3947] bg-[#0f141b] p-4">
            <h3 className="inline-flex items-center gap-2 text-base font-semibold">
              <ChartNoAxesColumnIncreasing size={17} /> SEO-focused founders
            </h3>
            <p className="mt-2 text-sm text-muted">
              Track launch pages, docs, and pricing pages weekly so rank and speed don’t decay unnoticed.
            </p>
          </div>
          <div className="rounded-xl border border-[#2f3947] bg-[#0f141b] p-4">
            <h3 className="inline-flex items-center gap-2 text-base font-semibold">
              <ChartNoAxesColumnIncreasing size={17} /> Growth and web agencies
            </h3>
            <p className="mt-2 text-sm text-muted">
              Watch every client’s key URLs from one dashboard, then use alerts to prioritize technical fixes before review calls.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <Pricing />
      </section>

      <section className="mt-14 panel p-6 md:p-8" id="faq">
        <h2 className="text-2xl font-semibold">FAQ</h2>
        <div className="mt-6 space-y-4">
          {faq.map((item) => (
            <article key={item.question} className="rounded-xl border border-[#2f3947] bg-[#0f141b] p-4">
              <h3 className="text-base font-semibold">{item.question}</h3>
              <p className="mt-2 text-sm text-muted">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
