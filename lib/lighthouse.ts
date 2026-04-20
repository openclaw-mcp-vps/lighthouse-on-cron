import { z } from "zod";

const scoreSchema = z.object({
  performance: z.number().min(0).max(100),
  accessibility: z.number().min(0).max(100),
  seo: z.number().min(0).max(100),
  bestPractices: z.number().min(0).max(100)
});

export type LighthouseScoreSet = z.infer<typeof scoreSchema>;

export async function runLighthouseAudit(url: string): Promise<{ scores: LighthouseScoreSet; report: unknown }> {
  const [{ default: lighthouse }, { launch }] = await Promise.all([import("lighthouse"), import("chrome-launcher")]);

  const chrome = await launch({
    chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"]
  });

  try {
    const result = await lighthouse(
      url,
      {
        port: chrome.port,
        output: "json",
        onlyCategories: ["performance", "accessibility", "seo", "best-practices"],
        logLevel: "error",
        formFactor: "mobile"
      },
      undefined
    );

    if (!result?.lhr?.categories) {
      throw new Error(`Lighthouse did not return categories for URL: ${url}`);
    }

    const categories = result.lhr.categories;
    const scorePayload = {
      performance: Math.round((categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
      seo: Math.round((categories.seo?.score ?? 0) * 100),
      bestPractices: Math.round((categories["best-practices"]?.score ?? 0) * 100)
    };

    return {
      scores: scoreSchema.parse(scorePayload),
      report: result.lhr
    };
  } finally {
    await chrome.kill();
  }
}
