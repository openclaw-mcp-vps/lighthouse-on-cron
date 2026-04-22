import { NextRequest, NextResponse } from "next/server";

import { sendWeeklyReportEmail } from "@/lib/email";
import {
  getLatestAuditForUrl,
  isSubscriberActive,
  listActiveSubscribers,
  listMonitoredUrls,
  saveAuditSnapshot
} from "@/lib/db";
import { runLighthouseAudit } from "@/lib/lighthouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REGRESSION_THRESHOLD = 5;

function getRunWeek(date: Date) {
  const run = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = run.getUTCDay();
  run.setUTCDate(run.getUTCDate() - day);
  return run.toISOString().slice(0, 10);
}

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return true;
  }

  const auth = request.headers.get("authorization");
  const xSecret = request.headers.get("x-cron-secret");

  return auth === `Bearer ${configuredSecret}` || xSecret === configuredSecret;
}

function scoreDelta(current: number, previous: number | null) {
  if (previous === null) return null;
  return Math.round((current - previous) * 10) / 10;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get("force") === "1";
  const now = new Date();

  if (!force && now.getUTCDay() !== 0) {
    return NextResponse.json({
      skipped: true,
      reason: "Lighthouse weekly cron runs on Sunday UTC.",
      today: now.toISOString().slice(0, 10)
    });
  }

  const runWeek = getRunWeek(now);
  const subscribers = listActiveSubscribers().filter((entry) => isSubscriberActive(entry.status));

  let processedSubscribers = 0;
  let processedUrls = 0;
  const errors: string[] = [];

  for (const subscriber of subscribers) {
    const targets = listMonitoredUrls(subscriber.email);
    if (targets.length === 0) {
      continue;
    }

    const rows: {
      url: string;
      performance: number;
      accessibility: number;
      seo: number;
      bestPractices: number;
      performanceDelta: number | null;
      accessibilityDelta: number | null;
      seoDelta: number | null;
      bestPracticesDelta: number | null;
    }[] = [];

    const regressions: string[] = [];

    for (const target of targets) {
      try {
        const previous = getLatestAuditForUrl(target.id);
        const result = await runLighthouseAudit(target.url);

        saveAuditSnapshot({
          monitoredUrlId: target.id,
          runWeek,
          performance: result.performance,
          accessibility: result.accessibility,
          seo: result.seo,
          bestPractices: result.bestPractices,
          lcp: result.lcp,
          cls: result.cls,
          tbt: result.tbt,
          fcp: result.fcp,
          speedIndex: result.speedIndex,
          rawJson: result.rawJson
        });

        const performanceDelta = scoreDelta(result.performance, previous?.performance ?? null);
        const accessibilityDelta = scoreDelta(result.accessibility, previous?.accessibility ?? null);
        const seoDelta = scoreDelta(result.seo, previous?.seo ?? null);
        const bestPracticesDelta = scoreDelta(result.bestPractices, previous?.bestPractices ?? null);

        rows.push({
          url: target.url,
          performance: result.performance,
          accessibility: result.accessibility,
          seo: result.seo,
          bestPractices: result.bestPractices,
          performanceDelta,
          accessibilityDelta,
          seoDelta,
          bestPracticesDelta
        });

        if (performanceDelta !== null && performanceDelta <= -REGRESSION_THRESHOLD) {
          regressions.push(`${target.url}: performance dropped ${Math.abs(performanceDelta).toFixed(1)} points`);
        }
        if (accessibilityDelta !== null && accessibilityDelta <= -REGRESSION_THRESHOLD) {
          regressions.push(
            `${target.url}: accessibility dropped ${Math.abs(accessibilityDelta).toFixed(1)} points`
          );
        }
        if (seoDelta !== null && seoDelta <= -REGRESSION_THRESHOLD) {
          regressions.push(`${target.url}: SEO dropped ${Math.abs(seoDelta).toFixed(1)} points`);
        }
        if (bestPracticesDelta !== null && bestPracticesDelta <= -REGRESSION_THRESHOLD) {
          regressions.push(
            `${target.url}: best practices dropped ${Math.abs(bestPracticesDelta).toFixed(1)} points`
          );
        }

        processedUrls += 1;
      } catch (error) {
        errors.push(
          `${target.url}: ${error instanceof Error ? error.message : "Lighthouse run failed for unknown reason."}`
        );
      }
    }

    if (rows.length > 0) {
      await sendWeeklyReportEmail({
        email: subscriber.email,
        runWeek,
        rows,
        regressions
      });
      processedSubscribers += 1;
    }
  }

  return NextResponse.json({
    processedSubscribers,
    processedUrls,
    runWeek,
    errors
  });
}
