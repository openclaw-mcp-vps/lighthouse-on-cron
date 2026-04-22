"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

interface AuditSnapshot {
  runWeek: string;
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  fcp: number | null;
  speedIndex: number | null;
}

interface ReportRow {
  urlId: number;
  url: string;
  current: AuditSnapshot | null;
  previous: AuditSnapshot | null;
}

interface ReportPayload {
  generatedAt: string;
  rows: ReportRow[];
}

function delta(current: number, previous: number | null) {
  if (previous === null) return null;
  return Math.round((current - previous) * 10) / 10;
}

function deltaColor(value: number | null) {
  if (value === null) return "text-zinc-400";
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-400";
}

function formatDelta(value: number | null) {
  if (value === null) return "new";
  if (value > 0) return `+${value.toFixed(1)}`;
  return value.toFixed(1);
}

function formatMs(value: number | null) {
  if (value === null) return "n/a";
  return `${value.toLocaleString()} ms`;
}

export function ReportViewer() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReport() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reports/latest", { cache: "no-store" });
      const data = (await response.json()) as ReportPayload | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Could not load report.");
      }

      setRows(data.rows);
      setGeneratedAt(data.generatedAt);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest weekly report</CardTitle>
        <CardDescription>
          Compare this week to last week across performance, accessibility, SEO, and best practices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-zinc-400">Loading report…</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No audits yet. Add URLs and wait for Sunday’s run, or manually trigger the cron endpoint.
          </p>
        ) : null}
        {!loading && !error && rows.length > 0 ? (
          <div className="space-y-4">
            {rows.map((row) => {
              const current = row.current;
              const previous = row.previous;

              if (!current) {
                return (
                  <div key={row.urlId} className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
                    <p className="mb-1 break-all text-sm font-semibold text-zinc-100">{row.url}</p>
                    <p className="text-sm text-zinc-400">No completed Lighthouse runs yet.</p>
                  </div>
                );
              }

              const performanceDelta = delta(current.performance, previous?.performance ?? null);
              const accessibilityDelta = delta(current.accessibility, previous?.accessibility ?? null);
              const seoDelta = delta(current.seo, previous?.seo ?? null);
              const bestDelta = delta(current.bestPractices, previous?.bestPractices ?? null);

              return (
                <div key={row.urlId} className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="break-all text-sm font-semibold text-zinc-100">{row.url}</p>
                    <p className="text-xs text-zinc-500">Week of {current.runWeek}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                      <p className="text-xs text-zinc-400">Performance</p>
                      <p className="text-xl font-semibold text-zinc-100">{current.performance.toFixed(1)}</p>
                      <p className={`text-xs ${deltaColor(performanceDelta)}`}>{formatDelta(performanceDelta)}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                      <p className="text-xs text-zinc-400">Accessibility</p>
                      <p className="text-xl font-semibold text-zinc-100">{current.accessibility.toFixed(1)}</p>
                      <p className={`text-xs ${deltaColor(accessibilityDelta)}`}>{formatDelta(accessibilityDelta)}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                      <p className="text-xs text-zinc-400">SEO</p>
                      <p className="text-xl font-semibold text-zinc-100">{current.seo.toFixed(1)}</p>
                      <p className={`text-xs ${deltaColor(seoDelta)}`}>{formatDelta(seoDelta)}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                      <p className="text-xs text-zinc-400">Best Practices</p>
                      <p className="text-xl font-semibold text-zinc-100">{current.bestPractices.toFixed(1)}</p>
                      <p className={`text-xs ${deltaColor(bestDelta)}`}>{formatDelta(bestDelta)}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
                    <p>LCP: {formatMs(current.lcp)}</p>
                    <p>FCP: {formatMs(current.fcp)}</p>
                    <p>TBT: {formatMs(current.tbt)}</p>
                    <p>CLS: {current.cls === null ? "n/a" : current.cls.toFixed(3)}</p>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-zinc-500">
              Generated {generatedAt ? new Date(generatedAt).toLocaleString() : "just now"}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
