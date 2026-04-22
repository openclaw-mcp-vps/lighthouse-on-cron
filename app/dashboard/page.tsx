import Link from "next/link";
import { cookies } from "next/headers";

import { AccessGate } from "@/components/access-gate";
import { Pricing } from "@/components/pricing";
import { ReportViewer } from "@/components/report-viewer";
import { UrlManager } from "@/components/url-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import { getSubscriber, isSubscriberActive } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const access = verifyAccessToken(token);

  const subscriber = access?.email ? getSubscriber(access.email) : null;
  const hasAccess = Boolean(subscriber && isSubscriberActive(subscriber.status));
  const planLabel = subscriber?.plan === "agency" ? "Agency" : "Starter";

  if (!hasAccess) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <header className="mb-10 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-widest text-zinc-300">
            LIGHTHOUSE ON CRON
          </Link>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            Back to landing page
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <AccessGate />
          <Card>
            <CardHeader>
              <CardTitle>Not subscribed yet?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-300">
              <p>
                Checkout is hosted by Stripe. After payment, return here with your billing email to unlock
                the dashboard.
              </p>
              <p>
                Weekly reports are sent every Sunday and include score deltas so regressions are obvious.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10">
          <Pricing compact />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm tracking-widest text-zinc-400">Lighthouse on Cron dashboard</p>
          <h1 className="text-3xl font-bold text-zinc-50">Weekly Core Web Vitals command center</h1>
          <p className="mt-1 text-sm text-zinc-400">Signed in as {subscriber?.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge>{planLabel} plan</Badge>
          <form action="/api/access/logout" method="post">
            <Button type="submit" variant="outline" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </header>

      <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
        Cron endpoint: <code className="text-zinc-100">/api/cron/lighthouse</code> runs every Sunday.
        Configure Vercel Cron and set <code className="text-zinc-100">CRON_SECRET</code> to protect the
        endpoint.
      </section>

      <div className="grid gap-6">
        <UrlManager />
        <ReportViewer />
      </div>
    </main>
  );
}
