import { NextRequest, NextResponse } from "next/server";
import {
  getLastCronWeek,
  getPreviousAuditBeforeWeek,
  getWeeklyCronTargets,
  setLastCronWeek,
  upsertAuditRun
} from "@/lib/db";
import { sendWeeklyReportEmail } from "@/lib/email";
import { runLighthouseAudit } from "@/lib/lighthouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REGRESSION_THRESHOLD = -5;

function getCurrentWeekKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekLabel(weekKey: string) {
  return new Date(`${weekKey}T00:00:00.000Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  });
}

function buildAlerts(
  current: { performance: number; accessibility: number; seo: number; bestPractices: number },
  previous: { performance: number; accessibility: number; seo: number; bestPractices: number } | null
) {
  if (!previous) {
    return [];
  }

  const alerts: string[] = [];
  if (current.performance - previous.performance <= REGRESSION_THRESHOLD) alerts.push("Performance dropped 5+ points");
  if (current.accessibility - previous.accessibility <= REGRESSION_THRESHOLD)
    alerts.push("Accessibility dropped 5+ points");
  if (current.seo - previous.seo <= REGRESSION_THRESHOLD) alerts.push("SEO dropped 5+ points");
  if (current.bestPractices - previous.bestPractices <= REGRESSION_THRESHOLD)
    alerts.push("Best practices dropped 5+ points");
  return alerts;
}

export async function GET(request: NextRequest) {
  return runCron(request);
}

export async function POST(request: NextRequest) {
  return runCron(request);
}

async function runCron(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const force = request.nextUrl.searchParams.get("force") === "1";

  if (!force && now.getUTCDay() !== 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Cron runs on Sunday UTC." });
  }

  const weekKey = getCurrentWeekKey(now);
  const lastWeek = await getLastCronWeek();
  if (!force && lastWeek === weekKey) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Already processed this week." });
  }

  const targets = await getWeeklyCronTargets();
  if (targets.length === 0) {
    await setLastCronWeek(weekKey);
    return NextResponse.json({ ok: true, skipped: true, reason: "No active URLs." });
  }

  let auditedCount = 0;
  let failedCount = 0;

  for (const user of targets) {
    const emailReports: Array<{
      url: string;
      current: {
        performance: number;
        accessibility: number;
        seo: number;
        bestPractices: number;
      };
      previous: {
        performance: number;
        accessibility: number;
        seo: number;
        bestPractices: number;
      } | null;
      regressionAlerts: string[];
    }> = [];

    for (const target of user.urls) {
      try {
        const [audit, previous] = await Promise.all([
          runLighthouseAudit(target.url),
          getPreviousAuditBeforeWeek(target.trackedUrlId, weekKey)
        ]);

        await upsertAuditRun({
          trackedUrlId: target.trackedUrlId,
          runWeek: weekKey,
          performance: audit.scores.performance,
          accessibility: audit.scores.accessibility,
          seo: audit.scores.seo,
          bestPractices: audit.scores.bestPractices,
          rawJson: audit.report
        });

        const regressionAlerts = buildAlerts(audit.scores, previous);
        emailReports.push({
          url: target.url,
          current: audit.scores,
          previous,
          regressionAlerts
        });
        auditedCount += 1;
      } catch (error) {
        failedCount += 1;
        console.error(`Lighthouse audit failed for ${target.url}`, error);
      }
    }

    if (emailReports.length > 0) {
      await sendWeeklyReportEmail({
        email: user.email,
        weekLabel: formatWeekLabel(weekKey),
        reports: emailReports
      });
    }
  }

  await setLastCronWeek(weekKey);

  return NextResponse.json({
    ok: true,
    week: weekKey,
    usersProcessed: targets.length,
    auditedCount,
    failedCount
  });
}
