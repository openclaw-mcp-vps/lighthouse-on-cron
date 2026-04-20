import crypto from "crypto";
import { Pool, type QueryResult, type QueryResultRow } from "pg";

export const ACCESS_COOKIE_NAME = "lighthouse_access";

export type PlanType = "starter" | "unlimited";

type DbUserRow = {
  id: number;
  email: string;
  plan: PlanType;
  urls_limit: number;
  subscription_status: string;
  access_token: string | null;
  access_token_expires: Date | null;
};

type MonitoredUrlRow = {
  id: number;
  user_id: number;
  url: string;
  created_at: Date;
};

type LighthouseRunRow = {
  id: number;
  monitored_url_id: number;
  url: string;
  performance: number;
  accessibility: number;
  seo: number;
  best_practices: number;
  run_at: Date;
};

type RegressionAlertRow = {
  category: "performance" | "accessibility" | "seo" | "best_practices";
  previous_score: number;
  current_score: number;
  delta: number;
};

export type DashboardReport = {
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

export type DashboardData = {
  user: {
    id: number;
    email: string;
    plan: PlanType;
    urlLimit: number;
    urlCount: number;
  };
  urls: Array<{
    id: number;
    url: string;
    createdAt: string;
  }>;
  reports: DashboardReport[];
};

type CreateRunInput = {
  userId: number;
  monitoredUrlId: number;
  url: string;
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  reportJson: unknown;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "on_trial", "paid"]);
const ACCESS_TOKEN_TTL_DAYS = 30;

const globalForDb = globalThis as unknown as {
  lighthousePool?: Pool;
  lighthouseSchemaReady?: boolean;
  lighthouseSchemaPromise?: Promise<void>;
};

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to use Lighthouse on Cron.");
  }
  return connectionString;
}

function getPool() {
  if (!globalForDb.lighthousePool) {
    globalForDb.lighthousePool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl:
        process.env.NODE_ENV === "production"
          ? {
              rejectUnauthorized: false
            }
          : undefined
    });
  }

  return globalForDb.lighthousePool;
}

async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
  await ensureSchema();
  return getPool().query<T>(text, params);
}

export async function ensureSchema() {
  if (globalForDb.lighthouseSchemaReady) {
    return;
  }

  if (!globalForDb.lighthouseSchemaPromise) {
    globalForDb.lighthouseSchemaPromise = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          plan TEXT NOT NULL DEFAULT 'starter',
          urls_limit INTEGER NOT NULL DEFAULT 10,
          subscription_status TEXT NOT NULL DEFAULT 'inactive',
          lemon_customer_id TEXT,
          lemon_subscription_id TEXT,
          access_token TEXT,
          access_token_expires TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS monitored_urls (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, url)
        );

        CREATE TABLE IF NOT EXISTS lighthouse_runs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          monitored_url_id INTEGER NOT NULL REFERENCES monitored_urls(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          performance INTEGER NOT NULL,
          accessibility INTEGER NOT NULL,
          seo INTEGER NOT NULL,
          best_practices INTEGER NOT NULL,
          run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          report_json JSONB NOT NULL DEFAULT '{}'::jsonb
        );

        CREATE TABLE IF NOT EXISTS regression_alerts (
          id SERIAL PRIMARY KEY,
          run_id INTEGER NOT NULL REFERENCES lighthouse_runs(id) ON DELETE CASCADE,
          category TEXT NOT NULL,
          previous_score INTEGER NOT NULL,
          current_score INTEGER NOT NULL,
          delta INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
        CREATE INDEX IF NOT EXISTS idx_users_access_token ON users(access_token);
        CREATE INDEX IF NOT EXISTS idx_monitored_urls_user_id ON monitored_urls(user_id);
        CREATE INDEX IF NOT EXISTS idx_lighthouse_runs_user_id ON lighthouse_runs(user_id);
        CREATE INDEX IF NOT EXISTS idx_lighthouse_runs_monitored_url_id ON lighthouse_runs(monitored_url_id);
        CREATE INDEX IF NOT EXISTS idx_lighthouse_runs_run_at ON lighthouse_runs(run_at DESC);
      `);
      globalForDb.lighthouseSchemaReady = true;
    })();
  }

  await globalForDb.lighthouseSchemaPromise;
}

export function inferPlan(variantName: string | null | undefined): PlanType {
  if (!variantName) return "starter";
  return variantName.toLowerCase().includes("unlimited") ? "unlimited" : "starter";
}

function urlLimitFromPlan(plan: PlanType) {
  return plan === "unlimited" ? 10000 : 10;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function generateAccessToken() {
  return crypto.randomBytes(24).toString("hex");
}

function accessTokenExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ACCESS_TOKEN_TTL_DAYS);
  return expiresAt;
}

async function issueAccessTokenByUserId(userId: number) {
  const token = generateAccessToken();
  const expiresAt = accessTokenExpiryDate();

  await query(
    `
    UPDATE users
    SET access_token = $2,
        access_token_expires = $3,
        updated_at = NOW()
    WHERE id = $1
  `,
    [userId, token, expiresAt]
  );

  return { token, expiresAt };
}

export async function upsertSubscriptionFromWebhook(input: {
  email: string;
  subscriptionStatus: string;
  plan: PlanType;
  lemonCustomerId?: string | null;
  lemonSubscriptionId?: string | null;
}) {
  const normalizedEmail = normalizeEmail(input.email);
  const urlsLimit = urlLimitFromPlan(input.plan);

  const upserted = await query<DbUserRow>(
    `
    INSERT INTO users (
      email,
      plan,
      urls_limit,
      subscription_status,
      lemon_customer_id,
      lemon_subscription_id
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT(email)
    DO UPDATE SET
      plan = EXCLUDED.plan,
      urls_limit = EXCLUDED.urls_limit,
      subscription_status = EXCLUDED.subscription_status,
      lemon_customer_id = COALESCE(EXCLUDED.lemon_customer_id, users.lemon_customer_id),
      lemon_subscription_id = COALESCE(EXCLUDED.lemon_subscription_id, users.lemon_subscription_id),
      updated_at = NOW()
    RETURNING id, email, plan, urls_limit, subscription_status, access_token, access_token_expires
  `,
    [
      normalizedEmail,
      input.plan,
      urlsLimit,
      input.subscriptionStatus,
      input.lemonCustomerId ?? null,
      input.lemonSubscriptionId ?? null
    ]
  );

  const user = upserted.rows[0];
  if (!user) {
    throw new Error("Unable to create or update subscriber record.");
  }

  if (ACTIVE_SUBSCRIPTION_STATUSES.has(input.subscriptionStatus)) {
    if (!user.access_token || !user.access_token_expires || user.access_token_expires < new Date()) {
      await issueAccessTokenByUserId(user.id);
    }
  }

  return user;
}

export async function verifyPurchasedEmailAndIssueToken(email: string) {
  const normalizedEmail = normalizeEmail(email);

  const result = await query<DbUserRow>(
    `
    SELECT id, email, plan, urls_limit, subscription_status, access_token, access_token_expires
    FROM users
    WHERE email = $1
      AND subscription_status = ANY($2::text[])
    LIMIT 1
  `,
    [normalizedEmail, [...ACTIVE_SUBSCRIPTION_STATUSES]]
  );

  const user = result.rows[0];
  if (!user) {
    return null;
  }

  return issueAccessTokenByUserId(user.id);
}

export async function getUserByAccessToken(token: string) {
  const result = await query<DbUserRow>(
    `
    SELECT id, email, plan, urls_limit, subscription_status, access_token, access_token_expires
    FROM users
    WHERE access_token = $1
      AND access_token_expires > NOW()
      AND subscription_status = ANY($2::text[])
    LIMIT 1
  `,
    [token, [...ACTIVE_SUBSCRIPTION_STATUSES]]
  );

  return result.rows[0] ?? null;
}

export async function addMonitoredUrl(userId: number, url: string) {
  const normalizedUrl = normalizeUrl(url);

  const limitsResult = await query<{ urls_limit: number }>(
    `
    SELECT urls_limit
    FROM users
    WHERE id = $1
    LIMIT 1
  `,
    [userId]
  );

  const limit = limitsResult.rows[0]?.urls_limit;
  if (!limit) {
    throw new Error("User record not found.");
  }

  const countResult = await query<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count
    FROM monitored_urls
    WHERE user_id = $1
  `,
    [userId]
  );

  const currentCount = Number(countResult.rows[0]?.count ?? 0);
  if (currentCount >= limit) {
    throw new Error(`Plan limit reached. Your plan supports ${limit} URLs.`);
  }

  const insertResult = await query<MonitoredUrlRow>(
    `
    INSERT INTO monitored_urls (user_id, url)
    VALUES ($1, $2)
    ON CONFLICT(user_id, url)
    DO UPDATE SET url = EXCLUDED.url
    RETURNING id, user_id, url, created_at
  `,
    [userId, normalizedUrl]
  );

  const row = insertResult.rows[0];
  return {
    id: row.id,
    url: row.url,
    createdAt: row.created_at.toISOString()
  };
}

export async function removeMonitoredUrl(userId: number, urlId: number) {
  await query(
    `
    DELETE FROM monitored_urls
    WHERE id = $1 AND user_id = $2
  `,
    [urlId, userId]
  );
}

export async function listMonitoredUrls(userId: number) {
  const result = await query<MonitoredUrlRow>(
    `
    SELECT id, user_id, url, created_at
    FROM monitored_urls
    WHERE user_id = $1
    ORDER BY created_at DESC
  `,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    url: row.url,
    createdAt: row.created_at.toISOString()
  }));
}

export async function getDashboardData(userId: number): Promise<DashboardData> {
  const [userResult, urlsResult, runsResult] = await Promise.all([
    query<DbUserRow>(
      `
      SELECT id, email, plan, urls_limit, subscription_status, access_token, access_token_expires
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
      [userId]
    ),
    query<MonitoredUrlRow>(
      `
      SELECT id, user_id, url, created_at
      FROM monitored_urls
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
      [userId]
    ),
    query<LighthouseRunRow>(
      `
      SELECT id, monitored_url_id, url, performance, accessibility, seo, best_practices, run_at
      FROM lighthouse_runs
      WHERE user_id = $1
      ORDER BY run_at DESC
      LIMIT 800
    `,
      [userId]
    )
  ]);

  const user = userResult.rows[0];
  if (!user) {
    throw new Error("Unable to load dashboard user context.");
  }

  const urls = urlsResult.rows.map((row) => ({
    id: row.id,
    url: row.url,
    createdAt: row.created_at.toISOString()
  }));

  const historyByUrl = new Map<number, DashboardReport["history"]>();
  for (const run of runsResult.rows) {
    const existing = historyByUrl.get(run.monitored_url_id) ?? [];
    if (existing.length < 12) {
      existing.push({
        runAt: run.run_at.toISOString(),
        performance: run.performance,
        accessibility: run.accessibility,
        seo: run.seo,
        bestPractices: run.best_practices
      });
      historyByUrl.set(run.monitored_url_id, existing);
    }
  }

  const reports: DashboardReport[] = urls.map((urlRow) => {
    const history = (historyByUrl.get(urlRow.id) ?? []).sort((a, b) => a.runAt.localeCompare(b.runAt));
    const latest = history[history.length - 1] ?? null;
    return {
      urlId: urlRow.id,
      url: urlRow.url,
      latest,
      history
    };
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      urlLimit: user.urls_limit,
      urlCount: urls.length
    },
    urls,
    reports
  };
}

export async function getActiveUsersWithUrls() {
  const result = await query<{ id: number; email: string; plan: PlanType }>(
    `
    SELECT DISTINCT u.id, u.email, u.plan
    FROM users u
    INNER JOIN monitored_urls mu ON mu.user_id = u.id
    WHERE u.subscription_status = ANY($1::text[])
    ORDER BY u.id ASC
  `,
    [[...ACTIVE_SUBSCRIPTION_STATUSES]]
  );

  return result.rows;
}

export async function getUrlsForUser(userId: number) {
  const result = await query<MonitoredUrlRow>(
    `
    SELECT id, user_id, url, created_at
    FROM monitored_urls
    WHERE user_id = $1
    ORDER BY created_at ASC
  `,
    [userId]
  );

  return result.rows;
}

export async function getLatestRunForMonitoredUrl(monitoredUrlId: number) {
  const result = await query<LighthouseRunRow>(
    `
    SELECT id, monitored_url_id, url, performance, accessibility, seo, best_practices, run_at
    FROM lighthouse_runs
    WHERE monitored_url_id = $1
    ORDER BY run_at DESC
    LIMIT 1
  `,
    [monitoredUrlId]
  );

  return result.rows[0] ?? null;
}

export async function createLighthouseRun(input: CreateRunInput) {
  const result = await query<{ id: number }>(
    `
    INSERT INTO lighthouse_runs (
      user_id,
      monitored_url_id,
      url,
      performance,
      accessibility,
      seo,
      best_practices,
      report_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    RETURNING id
  `,
    [
      input.userId,
      input.monitoredUrlId,
      input.url,
      input.performance,
      input.accessibility,
      input.seo,
      input.bestPractices,
      JSON.stringify(input.reportJson)
    ]
  );

  return result.rows[0]?.id;
}

export async function createRegressionAlerts(runId: number, alerts: RegressionAlertRow[]) {
  if (alerts.length === 0) {
    return;
  }

  const values: string[] = [];
  const params: Array<number | string> = [];

  alerts.forEach((alert, index) => {
    const offset = index * 4;
    values.push(`($1, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
    params.push(alert.category, alert.previous_score, alert.current_score, alert.delta);
  });

  await query(
    `
    INSERT INTO regression_alerts (run_id, category, previous_score, current_score, delta)
    VALUES ${values.join(",")}
  `,
    [runId, ...params]
  );
}

export async function getRunAlerts(runId: number) {
  const result = await query<RegressionAlertRow>(
    `
    SELECT category, previous_score, current_score, delta
    FROM regression_alerts
    WHERE run_id = $1
    ORDER BY id ASC
  `,
    [runId]
  );

  return result.rows;
}
