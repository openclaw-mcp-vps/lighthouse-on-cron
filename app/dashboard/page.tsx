import Link from "next/link";
import { cookies } from "next/headers";
import { BarChart3, LockKeyhole, Sparkles } from "lucide-react";
import { Pricing } from "@/components/pricing";
import { ReportViewer } from "@/components/report-viewer";
import { UrlManager } from "@/components/url-manager";
import { LogoutButton } from "@/components/logout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/access";
import { findActiveSubscriptionByEmail, getDashboardReportByEmail, listTrackedUrlsByEmail } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const access = rawToken ? verifyAccessToken(rawToken) : null;

  if (!access) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-10 md:px-8">
        <Card className="glow">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-2xl">
              <LockKeyhole size={22} />
              Dashboard locked
            </CardTitle>
            <CardDescription>
              Lighthouse runs, score history, and regression alerts are available only to active subscribers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted">
            <p>
              Complete checkout, then use your purchase email to unlock this browser. Access is stored in a secure cookie.
            </p>
            <Link href="/" className="text-[#58a6ff] hover:underline">
              Back to pricing
            </Link>
          </CardContent>
        </Card>

        <section className="mt-8">
          <Pricing />
        </section>
      </main>
    );
  }

  let subscription;
  try {
    subscription = await findActiveSubscriptionByEmail(access.email);
  } catch {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-10 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Database not configured</CardTitle>
            <CardDescription>
              Set `DATABASE_URL` and reload. Dashboard data, subscriptions, and reports require Postgres.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!subscription?.active) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-10 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Subscription inactive</CardTitle>
            <CardDescription>
              Your cookie is valid, but we couldn&apos;t find an active Lemon Squeezy subscription for {access.email}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">
              Use the unlock form again after renewal, or purchase with the same email used for this dashboard.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const [urls, reportRows] = await Promise.all([
    listTrackedUrlsByEmail(access.email),
    getDashboardReportByEmail(access.email)
  ]);

  const urlLimit = subscription.plan === "unlimited" ? Number.POSITIVE_INFINITY : 10;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-10 md:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-sm text-muted">Weekly Lighthouse monitoring for {access.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{subscription.plan === "unlimited" ? "Unlimited" : "Starter"}</Badge>
          <LogoutButton />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription className="inline-flex items-center gap-2">
              <Sparkles size={15} />
              Active URLs
            </CardDescription>
            <CardTitle className="text-3xl">{urls.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="inline-flex items-center gap-2">
              <BarChart3 size={15} />
              Plan limit
            </CardDescription>
            <CardTitle className="text-3xl">{Number.isFinite(urlLimit) ? urlLimit : "∞"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="inline-flex items-center gap-2">
              <Sparkles size={15} />
              Weekly schedule
            </CardDescription>
            <CardTitle className="text-3xl">Sunday</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="mt-6">
        <UrlManager initialUrls={urls} urlLimit={urlLimit} />
      </section>

      <section className="mt-6">
        <ReportViewer rows={reportRows} />
      </section>
    </main>
  );
}
