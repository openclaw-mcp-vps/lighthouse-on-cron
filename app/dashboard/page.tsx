import Link from "next/link";
import { cookies } from "next/headers";
import { BarChart3, CalendarClock, MailOpen, ShieldCheck } from "lucide-react";
import { CheckoutButton } from "@/components/checkout-button";
import { LighthouseReport } from "@/components/lighthouse-report";
import { UnlockForm } from "@/components/unlock-form";
import { UrlManager } from "@/components/url-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCESS_COOKIE_NAME, getDashboardData, getUserByAccessToken } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function LockedView() {
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
  const checkoutUrl = productId
    ? `https://app.lemonsqueezy.com/checkout/buy/${productId}`
    : "https://app.lemonsqueezy.com/checkout";

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#f0f6fc]">Dashboard Access Required</h1>
          <p className="mt-2 text-sm text-[#8b949e]">The monitoring tool is available to active subscribers only.</p>
        </div>
        <Link href="/" className="text-sm text-[#58a6ff] hover:underline">
          Back to landing page
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-[#f0f6fc]">What you unlock</CardTitle>
          <CardDescription>Automated weekly audits with direct action signals.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-4 text-sm text-[#c9d1d9]">
            <div className="mb-2 flex items-center gap-2 font-semibold text-[#f0f6fc]">
              <BarChart3 className="h-4 w-4 text-[#58a6ff]" />
              Weekly Lighthouse trendlines
            </div>
            Track score movement per URL over time.
          </div>
          <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-4 text-sm text-[#c9d1d9]">
            <div className="mb-2 flex items-center gap-2 font-semibold text-[#f0f6fc]">
              <MailOpen className="h-4 w-4 text-[#58a6ff]" />
              Sunday email summaries
            </div>
            Actionable report with category-level score changes.
          </div>
          <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-4 text-sm text-[#c9d1d9]">
            <div className="mb-2 flex items-center gap-2 font-semibold text-[#f0f6fc]">
              <CalendarClock className="h-4 w-4 text-[#58a6ff]" />
              Cron-based automation
            </div>
            No manual checks. Sundays run automatically.
          </div>
          <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-4 text-sm text-[#c9d1d9]">
            <div className="mb-2 flex items-center gap-2 font-semibold text-[#f0f6fc]">
              <ShieldCheck className="h-4 w-4 text-[#58a6ff]" />
              Regression alerts
            </div>
            Detect 5+ point drops compared with last week.
          </div>
        </CardContent>
      </Card>

      <div className="mb-6">
        <CheckoutButton href={checkoutUrl} label="Subscribe and Unlock" className="justify-center" />
      </div>

      <UnlockForm />
    </main>
  );
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    return <LockedView />;
  }

  try {
    const user = await getUserByAccessToken(accessToken);
    if (!user) {
      return <LockedView />;
    }

    const dashboardData = await getDashboardData(user.id);

    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#f0f6fc]">Your Lighthouse Dashboard</h1>
            <p className="mt-2 text-sm text-[#8b949e]">
              Weekly snapshots and trendlines for your monitored URLs. Sunday runs happen automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={dashboardData.user.plan === "unlimited" ? "success" : "secondary"}>
              {dashboardData.user.plan === "unlimited" ? "Unlimited" : "Starter"}
            </Badge>
            <Badge variant="secondary">{dashboardData.user.email}</Badge>
          </div>
        </div>

        <div className="space-y-6">
          <UrlManager
            initialUrls={dashboardData.urls}
            plan={dashboardData.user.plan}
            urlLimit={dashboardData.user.urlLimit}
          />
          <LighthouseReport reports={dashboardData.reports} />
        </div>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#f0f6fc]">Dashboard unavailable</CardTitle>
            <CardDescription>
              We could not load dashboard data. Check database configuration and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-sm text-[#ff7b72]">{message}</p>
          </CardContent>
        </Card>
      </main>
    );
  }
}
