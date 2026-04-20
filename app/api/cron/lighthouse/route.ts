import { NextRequest, NextResponse } from "next/server";
import {
  createLighthouseRun,
  createRegressionAlerts,
  getActiveUsersWithUrls,
  getLatestRunForMonitoredUrl,
  getUrlsForUser
} from "@/lib/db";
import { sendWeeklyReportEmail } from "@/lib/email";
import { runLighthouseAudit } from "@/lib/lighthouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WeeklyUserReport = {
  url: string;
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  regressions: Array<{
    category: string;
    previous: number;
    current: number;
    delta: number;
  }>;
};

function readCronAuthToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.replace("Bearer ", "").trim();
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Missing CRON_SECRET." }, { status: 500 });
  }

  const token = readCronAuthToken(request);
  if (!token || token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized cron invocation." }, { status: 401 });
  }

  const startedAt = Date.now();
  const users = await getActiveUsersWithUrls();
  const summary: Array<{
    email: string;
    urlsAudited: number;
    failed: number;
    alerts: number;
  }> = [];

  for (const user of users) {
    const monitoredUrls = await getUrlsForUser(user.id);
    const emailReports: WeeklyUserReport[] = [];
    let alertsCount = 0;
    let failCount = 0;

    for (const monitoredUrl of monitoredUrls) {
      try {
        const previousRun = await getLatestRunForMonitoredUrl(monitoredUrl.id);
        const audit = await runLighthouseAudit(monitoredUrl.url);

        const runId = await createLighthouseRun({
          userId: user.id,
          monitoredUrlId: monitoredUrl.id,
          url: monitoredUrl.url,
          performance: audit.scores.performance,
          accessibility: audit.scores.accessibility,
          seo: audit.scores.seo,
          bestPractices: audit.scores.bestPractices,
          reportJson: audit.report
        });

        if (!runId) {
          throw new Error(`Could not persist audit for ${monitoredUrl.url}`);
        }

        const regressions: WeeklyUserReport["regressions"] = [];
        if (previousRun) {
          const deltaPerformance = audit.scores.performance - previousRun.performance;
          const deltaAccessibility = audit.scores.accessibility - previousRun.accessibility;
          const deltaSeo = audit.scores.seo - previousRun.seo;
          const deltaBestPractices = audit.scores.bestPractices - previousRun.best_practices;

          if (deltaPerformance <= -5) {
            regressions.push({
              category: "performance",
              previous: previousRun.performance,
              current: audit.scores.performance,
              delta: deltaPerformance
            });
          }

          if (deltaAccessibility <= -5) {
            regressions.push({
              category: "accessibility",
              previous: previousRun.accessibility,
              current: audit.scores.accessibility,
              delta: deltaAccessibility
            });
          }

          if (deltaSeo <= -5) {
            regressions.push({
              category: "seo",
              previous: previousRun.seo,
              current: audit.scores.seo,
              delta: deltaSeo
            });
          }

          if (deltaBestPractices <= -5) {
            regressions.push({
              category: "best_practices",
              previous: previousRun.best_practices,
              current: audit.scores.bestPractices,
              delta: deltaBestPractices
            });
          }
        }

        await createRegressionAlerts(
          runId,
          regressions.map((entry) => ({
            category: entry.category as "performance" | "accessibility" | "seo" | "best_practices",
            previous_score: entry.previous,
            current_score: entry.current,
            delta: entry.delta
          }))
        );

        alertsCount += regressions.length;

        emailReports.push({
          url: monitoredUrl.url,
          performance: audit.scores.performance,
          accessibility: audit.scores.accessibility,
          seo: audit.scores.seo,
          bestPractices: audit.scores.bestPractices,
          regressions
        });
      } catch (error) {
        failCount += 1;
        console.error(`Lighthouse cron failed for ${monitoredUrl.url}:`, error);
      }
    }

    if (emailReports.length > 0) {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://lighthouse-on-cron.com"}/dashboard`;
      await sendWeeklyReportEmail(user.email, {
        dashboardUrl,
        generatedForDate: new Date().toUTCString(),
        urlReports: emailReports
      });
    }

    summary.push({
      email: user.email,
      urlsAudited: emailReports.length,
      failed: failCount,
      alerts: alertsCount
    });
  }

  return NextResponse.json({
    ok: true,
    usersProcessed: users.length,
    elapsedMs: Date.now() - startedAt,
    summary
  });
}
