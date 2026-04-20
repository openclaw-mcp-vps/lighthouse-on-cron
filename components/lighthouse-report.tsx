"use client";

import { useMemo } from "react";
import {
  BarChart2,
  BarChart3,
  ClipboardCheck,
  SearchCheck,
  ShieldAlert,
  Zap
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReportItem = {
  urlId: number;
  url: string;
  latest: {
    runAt: string;
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  } | null;
  history: Array<{
    runAt: string;
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  }>;
};

type LighthouseReportProps = {
  reports: ReportItem[];
};

const scoreMeta = [
  {
    key: "performance",
    label: "Performance",
    icon: Zap,
    color: "#58a6ff"
  },
  {
    key: "accessibility",
    label: "Accessibility",
    icon: ClipboardCheck,
    color: "#3fb950"
  },
  {
    key: "seo",
    label: "SEO",
    icon: SearchCheck,
    color: "#f2cc60"
  },
  {
    key: "bestPractices",
    label: "Best Practices",
    icon: ShieldAlert,
    color: "#ff7b72"
  }
] as const;

function scoreTone(score: number) {
  if (score >= 90) return "#3fb950";
  if (score >= 70) return "#d29922";
  return "#f85149";
}

export function LighthouseReport({ reports }: LighthouseReportProps) {
  const aggregated = useMemo(() => {
    const latestRuns = reports.map((report) => report.latest).filter(Boolean) as NonNullable<ReportItem["latest"]>[];

    if (latestRuns.length === 0) {
      return null;
    }

    const total = latestRuns.reduce(
      (acc, run) => {
        acc.performance += run.performance;
        acc.accessibility += run.accessibility;
        acc.seo += run.seo;
        acc.bestPractices += run.bestPractices;
        return acc;
      },
      { performance: 0, accessibility: 0, seo: 0, bestPractices: 0 }
    );

    return {
      performance: Math.round(total.performance / latestRuns.length),
      accessibility: Math.round(total.accessibility / latestRuns.length),
      seo: Math.round(total.seo / latestRuns.length),
      bestPractices: Math.round(total.bestPractices / latestRuns.length)
    };
  }, [reports]);

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-[#f0f6fc]">Lighthouse Reports</CardTitle>
          <CardDescription>Add URLs to see weekly performance trends and regressions.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#f0f6fc]">
            <BarChart2 className="h-5 w-5 text-[#58a6ff]" />
            Portfolio Snapshot
          </CardTitle>
          <CardDescription>Average score across the latest run for each monitored URL.</CardDescription>
        </CardHeader>
        <CardContent>
          {aggregated ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {scoreMeta.map((item) => {
                const Icon = item.icon;
                const value = aggregated[item.key];
                return (
                  <div key={item.key} className="rounded-lg border border-[#30363d] bg-[#0d1117] p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-[#8b949e]">
                      <Icon className="h-4 w-4" style={{ color: item.color }} />
                      {item.label}
                    </div>
                    <div className="text-2xl font-bold" style={{ color: scoreTone(value) }}>
                      {value}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#8b949e]">No runs yet. The next Sunday cron run will populate scores.</p>
          )}
        </CardContent>
      </Card>

      {reports.map((report) => {
        const chartData = report.history.map((entry) => ({
          date: new Date(entry.runAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          performance: entry.performance,
          accessibility: entry.accessibility,
          seo: entry.seo,
          bestPractices: entry.bestPractices
        }));

        return (
          <Card key={report.urlId}>
            <CardHeader>
              <CardTitle className="text-[#f0f6fc]">{report.url}</CardTitle>
              <CardDescription>
                {report.latest
                  ? `Last run: ${new Date(report.latest.runAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}`
                  : "No runs yet for this URL."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.latest ? (
                <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {scoreMeta.map((item) => {
                    const value = report.latest?.[item.key] ?? 0;
                    return (
                      <div key={item.key} className="rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2">
                        <div className="text-xs text-[#8b949e]">{item.label}</div>
                        <div className="text-lg font-semibold" style={{ color: scoreTone(value) }}>
                          {value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {chartData.length > 1 ? (
                <div className="h-72 w-full rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#8b949e" />
                      <YAxis domain={[0, 100]} stroke="#8b949e" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#161b22",
                          border: "1px solid #30363d",
                          borderRadius: "8px",
                          color: "#e6edf3"
                        }}
                      />
                      <Line type="monotone" dataKey="performance" stroke="#58a6ff" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="accessibility" stroke="#3fb950" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="seo" stroke="#f2cc60" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="bestPractices" stroke="#ff7b72" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#30363d] bg-[#0d1117] p-6 text-sm text-[#8b949e]">
                  <div className="mb-2 flex items-center gap-2 text-[#c9d1d9]">
                    <BarChart3 className="h-4 w-4" />
                    Trend chart appears after at least two weekly runs.
                  </div>
                  Keep this URL active and Sunday reports will build your trendline.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
