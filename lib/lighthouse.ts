export type CategoryScores = {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
};

export type LighthouseAudit = {
  requestedUrl: string;
  finalUrl: string;
  fetchTime: string;
  scores: CategoryScores;
  report: unknown;
};

function toPercent(rawScore: number | null | undefined) {
  if (rawScore === null || rawScore === undefined) {
    return 0;
  }
  return Math.round(rawScore * 100);
}

export async function runLighthouseAudit(targetUrl: string): Promise<LighthouseAudit> {
  const normalizedUrl = /^https?:\/\//i.test(targetUrl) ? targetUrl : `https://${targetUrl}`;

  const chromeLauncher = await import("chrome-launcher");
  const lighthouseModule = await import("lighthouse");
  const lighthouse = lighthouseModule.default;

  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"]
  });

  try {
    const runnerResult = await lighthouse(
      normalizedUrl,
      {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"]
      },
      {
        extends: "lighthouse:default"
      }
    );

    const lhr = runnerResult?.lhr;
    if (!lhr) {
      throw new Error(`Lighthouse failed for ${normalizedUrl}.`);
    }

    const scores: CategoryScores = {
      performance: toPercent(lhr.categories.performance?.score),
      accessibility: toPercent(lhr.categories.accessibility?.score),
      seo: toPercent(lhr.categories.seo?.score),
      bestPractices: toPercent(lhr.categories["best-practices"]?.score)
    };

    return {
      requestedUrl: normalizedUrl,
      finalUrl: lhr.finalUrl ?? normalizedUrl,
      fetchTime: lhr.fetchTime ?? new Date().toISOString(),
      scores,
      report: lhr
    };
  } finally {
    await chrome.kill();
  }
}
