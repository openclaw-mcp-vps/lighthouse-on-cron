import "server-only";

import { Resend } from "resend";

interface ScoreEmailRow {
  url: string;
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  performanceDelta: number | null;
  accessibilityDelta: number | null;
  seoDelta: number | null;
  bestPracticesDelta: number | null;
}

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return null;
  }

  return new Resend(key);
}

function deltaLabel(delta: number | null) {
  if (delta === null) return "new";
  if (delta === 0) return "0";
  const fixed = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  return fixed;
}

function toPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export async function sendAccessCodeEmail(params: { email: string; code: string }) {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL ?? "Lighthouse on Cron <noreply@example.com>";

  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      return { delivered: false, devCode: params.code };
    }
    throw new Error("RESEND_API_KEY is required to send access codes in production.");
  }

  await resend.emails.send({
    from,
    to: params.email,
    subject: "Your Lighthouse on Cron access code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827;">
        <h1 style="font-size:20px;margin:0 0 12px;">Access code</h1>
        <p style="line-height:1.5;margin:0 0 16px;">Use this code to unlock your Lighthouse on Cron dashboard:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:0 0 12px;">${params.code}</p>
        <p style="line-height:1.5;color:#4b5563;margin:0;">This code expires in 15 minutes.</p>
      </div>
    `
  });

  return { delivered: true };
}

export async function sendWeeklyReportEmail(params: {
  email: string;
  runWeek: string;
  rows: ScoreEmailRow[];
  regressions: string[];
}) {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL ?? "Lighthouse on Cron <noreply@example.com>";

  if (!resend) {
    return { delivered: false };
  }

  const rowsHtml = params.rows
    .map(
      (row) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${row.url}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${toPercent(row.performance)} (${deltaLabel(row.performanceDelta)})</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${toPercent(row.accessibility)} (${deltaLabel(row.accessibilityDelta)})</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${toPercent(row.seo)} (${deltaLabel(row.seoDelta)})</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${toPercent(row.bestPractices)} (${deltaLabel(row.bestPracticesDelta)})</td>
      </tr>
    `
    )
    .join("");

  const regressionsHtml =
    params.regressions.length === 0
      ? "<p style=\"margin:0;color:#047857;\">No major regressions this week.</p>"
      : `<ul style="margin:0;padding-left:20px;">${params.regressions
          .map((item) => `<li style="margin:6px 0;">${item}</li>`)
          .join("")}</ul>`;

  await resend.emails.send({
    from,
    to: params.email,
    subject: `Weekly Lighthouse report · ${params.runWeek}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:24px;color:#111827;">
        <h1 style="font-size:24px;margin:0 0 8px;">Weekly Core Web Vitals report</h1>
        <p style="margin:0 0 18px;color:#4b5563;">Scores are from the latest Lighthouse mobile run completed for week ${params.runWeek}.</p>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;">
          <thead>
            <tr style="background:#f3f4f6;text-align:left;">
              <th style="padding:10px;">URL</th>
              <th style="padding:10px;">Performance</th>
              <th style="padding:10px;">Accessibility</th>
              <th style="padding:10px;">SEO</th>
              <th style="padding:10px;">Best Practices</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <h2 style="font-size:16px;margin:0 0 8px;">Regression alerts</h2>
        ${regressionsHtml}

        <p style="margin:18px 0 0;color:#4b5563;">Open your dashboard to inspect trends and prioritize fixes before rankings and conversion rates drop.</p>
      </div>
    `
  });

  return { delivered: true };
}
