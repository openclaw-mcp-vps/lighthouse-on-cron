import { AlertTriangle, CheckCircle2, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Scores = {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
};

type ReportRow = {
  trackedUrlId: number;
  url: string;
  current: (Scores & { runWeek: string; createdAt: string }) | null;
  previous: (Scores & { runWeek: string; createdAt?: string }) | null;
};

type ReportViewerProps = {
  rows: ReportRow[];
};

function scoreTone(score: number) {
  if (score >= 90) return "text-[#3fb950]";
  if (score >= 75) return "text-[#d29922]";
  return "text-[#f85149]";
}

function deltaFor(current: number, previous: number | undefined) {
  if (typeof previous !== "number") {
    return { value: "new", icon: <Minus size={14} />, tone: "text-muted" };
  }

  const delta = current - previous;
  if (delta >= 5) {
    return { value: `+${delta}`, icon: <TrendingUp size={14} />, tone: "text-[#3fb950]" };
  }
  if (delta <= -5) {
    return { value: `${delta}`, icon: <TrendingDown size={14} />, tone: "text-[#f85149]" };
  }
  return { value: `${delta > 0 ? "+" : ""}${delta}`, icon: <Minus size={14} />, tone: "text-muted" };
}

function metricBlock(label: string, current: number, previous?: number) {
  const delta = deltaFor(current, previous);
  return (
    <div className="rounded-xl border border-[#2f3947] bg-[#0f141b] p-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${scoreTone(current)}`}>{current}</p>
      <p className={`mt-1 inline-flex items-center gap-1 text-xs ${delta.tone}`}>
        {delta.icon}
        {delta.value} vs last run
      </p>
    </div>
  );
}

export function ReportViewer({ rows }: ReportViewerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest weekly scores</CardTitle>
        <CardDescription>
          Score regressions of 5+ points are highlighted. Keep these pages green to protect rankings and conversion speed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No tracked URLs yet. Add URLs above to start receiving Sunday reports.</p>
        ) : (
          rows.map((row) => {
            const current = row.current;
            if (!current) {
              return (
                <div key={row.trackedUrlId} className="rounded-2xl border border-[#2f3947] bg-[#0f141b] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <a href={row.url} target="_blank" rel="noreferrer" className="text-sm text-[#58a6ff] hover:underline">
                      {row.url}
                    </a>
                    <Badge variant="secondary">Pending first audit</Badge>
                  </div>
                  <p className="text-sm text-muted">Your first report for this URL will appear after the next Sunday run.</p>
                </div>
              );
            }

            const previous = row.previous ?? undefined;
            const hasRegression =
              (typeof previous?.performance === "number" && current.performance - previous.performance <= -5) ||
              (typeof previous?.accessibility === "number" && current.accessibility - previous.accessibility <= -5) ||
              (typeof previous?.seo === "number" && current.seo - previous.seo <= -5) ||
              (typeof previous?.bestPractices === "number" && current.bestPractices - previous.bestPractices <= -5);

            return (
              <div key={row.trackedUrlId} className="rounded-2xl border border-[#2f3947] bg-[#0f141b] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <a href={row.url} target="_blank" rel="noreferrer" className="truncate text-sm text-[#58a6ff] hover:underline">
                    {row.url}
                  </a>
                  {hasRegression ? (
                    <Badge variant="danger" className="inline-flex items-center gap-1">
                      <AlertTriangle size={13} /> Regression detected
                    </Badge>
                  ) : (
                    <Badge className="inline-flex items-center gap-1">
                      <CheckCircle2 size={13} /> Stable
                    </Badge>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {metricBlock("Performance", current.performance, previous?.performance)}
                  {metricBlock("Accessibility", current.accessibility, previous?.accessibility)}
                  {metricBlock("SEO", current.seo, previous?.seo)}
                  {metricBlock("Best Practices", current.bestPractices, previous?.bestPractices)}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
