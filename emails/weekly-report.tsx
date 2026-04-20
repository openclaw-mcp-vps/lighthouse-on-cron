import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from "@react-email/components";

type UrlReport = {
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

export type WeeklyReportEmailProps = {
  dashboardUrl: string;
  generatedForDate: string;
  urlReports: UrlReport[];
};

export function WeeklyReportEmail({
  dashboardUrl,
  generatedForDate,
  urlReports
}: WeeklyReportEmailProps) {
  const totalUrls = urlReports.length;
  const regressionCount = urlReports.reduce((count, report) => count + report.regressions.length, 0);

  return (
    <Html>
      <Head />
      <Preview>{`Weekly Lighthouse digest: ${totalUrls} URLs scanned, ${regressionCount} regression alerts.`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Lighthouse on Cron - Weekly Report</Heading>
          <Text style={styles.muted}>Generated: {generatedForDate}</Text>
          <Text style={styles.text}>
            Your Sunday audit completed successfully. This report compares this week&apos;s Lighthouse results against the
            previous run for each tracked URL.
          </Text>

          <Section style={styles.statRow}>
            <div style={styles.statCard}>
              <Text style={styles.statLabel}>URLs Audited</Text>
              <Text style={styles.statValue}>{totalUrls}</Text>
            </div>
            <div style={styles.statCard}>
              <Text style={styles.statLabel}>Regression Alerts</Text>
              <Text style={styles.statValue}>{regressionCount}</Text>
            </div>
          </Section>

          <Hr style={styles.hr} />

          {urlReports.map((report) => (
            <Section key={report.url} style={styles.urlSection}>
              <Text style={styles.urlTitle}>{report.url}</Text>
              <Text style={styles.scoreLine}>
                Performance: <strong>{report.performance}</strong> | Accessibility: <strong>{report.accessibility}</strong>{" "}
                | SEO: <strong>{report.seo}</strong> | Best Practices: <strong>{report.bestPractices}</strong>
              </Text>
              {report.regressions.length > 0 ? (
                <Section>
                  {report.regressions.map((regression, index) => (
                    <Text key={`${report.url}-${regression.category}-${index}`} style={styles.regression}>
                      {regression.category}: {regression.previous} to {regression.current} ({regression.delta})
                    </Text>
                  ))}
                </Section>
              ) : (
                <Text style={styles.good}>No significant regressions detected.</Text>
              )}
              <Hr style={styles.innerHr} />
            </Section>
          ))}

          <Text style={styles.text}>
            Review trends and manage tracked URLs in your dashboard: <Link href={dashboardUrl}>Open dashboard</Link>
          </Text>
          <Text style={styles.footer}>Lighthouse on Cron</Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#0d1117",
    color: "#e6edf3",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    margin: "0",
    padding: "24px"
  },
  container: {
    backgroundColor: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "12px",
    margin: "0 auto",
    maxWidth: "640px",
    padding: "24px"
  },
  heading: {
    color: "#f0f6fc",
    fontSize: "24px",
    marginBottom: "8px"
  },
  muted: {
    color: "#8b949e",
    fontSize: "13px",
    margin: "0 0 14px"
  },
  text: {
    color: "#c9d1d9",
    fontSize: "14px",
    lineHeight: "1.6"
  },
  statRow: {
    display: "flex",
    gap: "12px",
    marginTop: "16px",
    marginBottom: "16px"
  },
  statCard: {
    border: "1px solid #30363d",
    borderRadius: "10px",
    padding: "12px",
    width: "50%"
  },
  statLabel: {
    color: "#8b949e",
    fontSize: "12px",
    margin: "0"
  },
  statValue: {
    color: "#f0f6fc",
    fontSize: "22px",
    fontWeight: "700",
    margin: "4px 0 0"
  },
  hr: {
    borderColor: "#30363d",
    margin: "16px 0"
  },
  innerHr: {
    borderColor: "#21262d",
    margin: "12px 0"
  },
  urlSection: {
    marginBottom: "8px"
  },
  urlTitle: {
    color: "#58a6ff",
    fontSize: "14px",
    fontWeight: "700",
    marginBottom: "4px"
  },
  scoreLine: {
    color: "#c9d1d9",
    fontSize: "13px",
    lineHeight: "1.5"
  },
  regression: {
    color: "#ff7b72",
    fontSize: "13px",
    margin: "3px 0"
  },
  good: {
    color: "#56d364",
    fontSize: "13px"
  },
  footer: {
    color: "#8b949e",
    fontSize: "12px",
    marginTop: "18px"
  }
};

export default WeeklyReportEmail;
