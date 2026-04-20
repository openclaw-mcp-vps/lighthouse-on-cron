import { Resend } from "resend";

type ScoreCard = {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
};

type UrlReportItem = {
  url: string;
  current: ScoreCard;
  previous?: ScoreCard | null;
  regressionAlerts: string[];
};

type WeeklyReportPayload = {
  email: string;
  weekLabel: string;
  reports: UrlReportItem[];
};

function metricDelta(current: number, previous: number | undefined) {
  if (previous === undefined) {
    return "new";
  }
  const delta = current - previous;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}`;
}

function renderReportHtml(payload: WeeklyReportPayload) {
  const rows = payload.reports
    .map((item) => {
      const prev = item.previous;
      const alertBadges =
        item.regressionAlerts.length > 0
          ? `<div style="margin-top:8px;color:#f85149;font-size:12px;">${item.regressionAlerts.join(" • ")}</div>`
          : "<div style=\"margin-top:8px;color:#8b949e;font-size:12px;\">No regressions detected</div>";

      return `
        <tr>
          <td style="padding:14px;border-bottom:1px solid #2f3947;vertical-align:top;">
            <a href="${item.url}" style="color:#58a6ff;text-decoration:none;">${item.url}</a>
            ${alertBadges}
          </td>
          <td style="padding:14px;border-bottom:1px solid #2f3947;text-align:center;">${item.current.performance} (${metricDelta(
            item.current.performance,
            prev?.performance
          )})</td>
          <td style="padding:14px;border-bottom:1px solid #2f3947;text-align:center;">${item.current.accessibility} (${metricDelta(
            item.current.accessibility,
            prev?.accessibility
          )})</td>
          <td style="padding:14px;border-bottom:1px solid #2f3947;text-align:center;">${item.current.seo} (${metricDelta(
            item.current.seo,
            prev?.seo
          )})</td>
          <td style="padding:14px;border-bottom:1px solid #2f3947;text-align:center;">${item.current.bestPractices} (${metricDelta(
            item.current.bestPractices,
            prev?.bestPractices
          )})</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="background:#0d1117;color:#f0f6fc;padding:24px;font-family:Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <h1 style="margin:0 0 10px;font-size:24px;">Your Lighthouse on Cron report</h1>
      <p style="margin:0 0 20px;color:#9aa4b2;">Week of ${payload.weekLabel}. Alerts appear when a score drops by 5+ points from the previous run.</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #2f3947;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#161b22;">
            <th style="padding:14px;text-align:left;border-bottom:1px solid #2f3947;">URL</th>
            <th style="padding:14px;text-align:center;border-bottom:1px solid #2f3947;">Performance</th>
            <th style="padding:14px;text-align:center;border-bottom:1px solid #2f3947;">Accessibility</th>
            <th style="padding:14px;text-align:center;border-bottom:1px solid #2f3947;">SEO</th>
            <th style="padding:14px;text-align:center;border-bottom:1px solid #2f3947;">Best Practices</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="margin-top:18px;color:#8b949e;font-size:12px;">
        You are receiving this weekly report because your Lighthouse on Cron subscription is active.
      </p>
    </div>
  `;
}

function renderReportText(payload: WeeklyReportPayload) {
  const lines = payload.reports.map((item) => {
    const prev = item.previous;
    const alerts = item.regressionAlerts.length > 0 ? ` | ALERTS: ${item.regressionAlerts.join(", ")}` : "";
    return `${item.url}\n  Perf ${item.current.performance} (${metricDelta(item.current.performance, prev?.performance)}) | A11y ${item.current.accessibility} (${metricDelta(item.current.accessibility, prev?.accessibility)}) | SEO ${item.current.seo} (${metricDelta(item.current.seo, prev?.seo)}) | Best ${item.current.bestPractices} (${metricDelta(item.current.bestPractices, prev?.bestPractices)})${alerts}`;
  });

  return [`Lighthouse on Cron weekly report (${payload.weekLabel})`, "", ...lines].join("\n");
}

export async function sendWeeklyReportEmail(payload: WeeklyReportPayload) {
  if (payload.reports.length === 0) {
    return { skipped: true, reason: "No reports to send." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { skipped: true, reason: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL." };
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: payload.email,
    subject: `Weekly Lighthouse report (${payload.weekLabel})`,
    html: renderReportHtml(payload),
    text: renderReportText(payload)
  });

  return { skipped: false };
}
