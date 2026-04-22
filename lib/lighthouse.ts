import "server-only";

export interface LighthouseSnapshot {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  fcp: number | null;
  speedIndex: number | null;
  rawJson: string;
}

function cleanUrl(input: string) {
  const trimmed = input.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(candidate);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Lighthouse audits only support HTTP(S) URLs.");
  }
  return parsed.toString();
}

function toScore(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Math.round(value * 1000) / 10;
}

function metricFromAudits(
  audits: Record<string, { numericValue?: number | null }>,
  key: string
): number | null {
  const metric = audits[key]?.numericValue;
  if (metric === undefined || metric === null || Number.isNaN(metric)) {
    return null;
  }
  return Math.round(metric);
}

export async function runLighthouseAudit(url: string): Promise<LighthouseSnapshot> {
  const target = cleanUrl(url);
  const lighthouseModule = await import("lighthouse");
  const chromeLauncher = await import("chrome-launcher");

  const lighthouse = (lighthouseModule.default ?? lighthouseModule) as unknown as (
    url: string,
    options: Record<string, unknown>,
    config: Record<string, unknown>
  ) => Promise<{ lhr?: Record<string, any> }>;

  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
  });

  try {
    const result = await lighthouse(
      target,
      {
        port: chrome.port,
        output: "json",
        logLevel: "error"
      },
      {
        extends: "lighthouse:default",
        settings: {
          onlyCategories: ["performance", "accessibility", "seo", "best-practices"],
          formFactor: "mobile",
          screenEmulation: {
            mobile: true,
            width: 390,
            height: 844,
            deviceScaleFactor: 2,
            disabled: false
          }
        }
      }
    );

    const lhr = result.lhr;
    if (!lhr) {
      throw new Error("Lighthouse did not return a report.");
    }

    const categories = (lhr.categories ?? {}) as Record<string, { score?: number | null }>;
    const audits = (lhr.audits ?? {}) as Record<string, { numericValue?: number | null }>;

    return {
      performance: toScore(categories.performance?.score),
      accessibility: toScore(categories.accessibility?.score),
      seo: toScore(categories.seo?.score),
      bestPractices: toScore(categories["best-practices"]?.score),
      lcp: metricFromAudits(audits, "largest-contentful-paint"),
      cls: metricFromAudits(audits, "cumulative-layout-shift"),
      tbt: metricFromAudits(audits, "total-blocking-time"),
      fcp: metricFromAudits(audits, "first-contentful-paint"),
      speedIndex: metricFromAudits(audits, "speed-index"),
      rawJson: JSON.stringify(lhr)
    };
  } finally {
    await chrome.kill();
  }
}
