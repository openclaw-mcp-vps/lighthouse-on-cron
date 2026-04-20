import { Resend } from "resend";
import WeeklyReportEmail, { type WeeklyReportEmailProps } from "@/emails/weekly-report";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromAddress = process.env.REPORTS_FROM_EMAIL ?? "Lighthouse on Cron <reports@lighthouse-on-cron.com>";

export async function sendWeeklyReportEmail(to: string, props: WeeklyReportEmailProps) {
  if (!resend) {
    console.warn("Resend API key missing. Skipping weekly report email.");
    return;
  }

  await resend.emails.send({
    from: fromAddress,
    to,
    subject: `Weekly Lighthouse digest - ${props.urlReports.length} URL${props.urlReports.length === 1 ? "" : "s"}`,
    react: WeeklyReportEmail(props)
  });
}

export async function sendAccessUnlockedEmail(input: { to: string; dashboardUrl: string }) {
  if (!resend) {
    console.warn("Resend API key missing. Skipping access email.");
    return;
  }

  await resend.emails.send({
    from: fromAddress,
    to: input.to,
    subject: "Your Lighthouse on Cron dashboard is ready",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0d1117; color:#e6edf3; padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;">
          <h1 style="margin:0 0 12px;font-size:22px;color:#f0f6fc;">You're in.</h1>
          <p style="margin:0 0 16px;line-height:1.6;color:#c9d1d9;">Your subscription is active and your dashboard is unlocked. Add your URLs so Sunday's report has fresh data.</p>
          <a href="${input.dashboardUrl}" style="display:inline-block;background:#2f81f7;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Open Dashboard</a>
        </div>
      </div>
    `
  });
}
