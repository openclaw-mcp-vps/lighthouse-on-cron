import { Pool } from "pg";

type PlanName = "starter" | "unlimited";

type SubscriptionStatus = "active" | "on_trial" | "paused" | "cancelled" | "expired" | "past_due";

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

function isProd() {
  return process.env.NODE_ENV === "production";
}

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for persistence.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: isProd() ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const db = getPool();

      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          plan TEXT NOT NULL DEFAULT 'starter',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id BIGSERIAL PRIMARY KEY,
          lemon_subscription_id TEXT NOT NULL UNIQUE,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status TEXT NOT NULL,
          plan TEXT NOT NULL,
          current_period_end TIMESTAMPTZ NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS tracked_urls (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          normalized_url TEXT NOT NULL,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, normalized_url)
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS audit_runs (
          id BIGSERIAL PRIMARY KEY,
          tracked_url_id BIGINT NOT NULL REFERENCES tracked_urls(id) ON DELETE CASCADE,
          run_week DATE NOT NULL,
          performance INTEGER NOT NULL,
          accessibility INTEGER NOT NULL,
          seo INTEGER NOT NULL,
          best_practices INTEGER NOT NULL,
          raw_json JSONB NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(tracked_url_id, run_week)
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await db.query("CREATE INDEX IF NOT EXISTS idx_urls_user_active ON tracked_urls(user_id, active);");
      await db.query("CREATE INDEX IF NOT EXISTS idx_audit_runs_url_week ON audit_runs(tracked_url_id, run_week DESC);");
      await db.query("CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);");
    })();
  }

  return schemaPromise;
}

export function normalizeUrl(raw: string) {
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol.trim());
  parsed.hash = "";
  if (parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1) || "/";
  }
  return parsed.toString();
}

function mapPlan(input: string | null | undefined): PlanName {
  const value = (input ?? "").toLowerCase();
  if (value.includes("unlimited") || value.includes("agency") || value.includes("29")) {
    return "unlimited";
  }
  return "starter";
}

function isActiveSubscription(status: string) {
  return status === "active" || status === "on_trial";
}

async function getOrCreateUser(email: string, plan: PlanName = "starter") {
  await ensureSchema();
  const db = getPool();
  const normalizedEmail = email.trim().toLowerCase();

  const result = await db.query<{ id: string; email: string; plan: PlanName }>(
    `
      INSERT INTO users(email, plan, updated_at)
      VALUES($1, $2, NOW())
      ON CONFLICT(email) DO UPDATE SET
        plan = EXCLUDED.plan,
        updated_at = NOW()
      RETURNING id, email, plan;
    `,
    [normalizedEmail, plan]
  );

  return {
    id: Number(result.rows[0].id),
    email: result.rows[0].email,
    plan: result.rows[0].plan
  };
}

export async function upsertSubscriptionFromWebhook(input: {
  email: string;
  lemonSubscriptionId: string;
  status: SubscriptionStatus;
  planLabel?: string | null;
  currentPeriodEnd?: string | null;
}) {
  await ensureSchema();
  const db = getPool();
  const plan = mapPlan(input.planLabel);
  const user = await getOrCreateUser(input.email, plan);

  await db.query(
    `
      INSERT INTO subscriptions(lemon_subscription_id, user_id, status, plan, current_period_end, updated_at)
      VALUES($1, $2, $3, $4, $5, NOW())
      ON CONFLICT(lemon_subscription_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        plan = EXCLUDED.plan,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW();
    `,
    [input.lemonSubscriptionId, user.id, input.status, plan, input.currentPeriodEnd ?? null]
  );

  await db.query("UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2", [plan, user.id]);
}

export async function findActiveSubscriptionByEmail(email: string) {
  await ensureSchema();
  const db = getPool();
  const result = await db.query<{
    email: string;
    plan: PlanName;
    status: string;
    current_period_end: string | null;
  }>(
    `
      SELECT u.email, s.plan, s.status, s.current_period_end
      FROM users u
      JOIN subscriptions s ON s.user_id = u.id
      WHERE u.email = $1
      ORDER BY s.updated_at DESC
      LIMIT 1;
    `,
    [email.trim().toLowerCase()]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    email: row.email,
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    active: isActiveSubscription(row.status)
  };
}

export async function getUrlLimitForEmail(email: string) {
  const subscription = await findActiveSubscriptionByEmail(email);
  if (!subscription || !subscription.active) {
    return 0;
  }
  return subscription.plan === "unlimited" ? Number.POSITIVE_INFINITY : 10;
}

export async function listTrackedUrlsByEmail(email: string) {
  await ensureSchema();
  const db = getPool();
  const rows = await db.query<{ id: string; url: string; created_at: string }>(
    `
      SELECT t.id, t.url, t.created_at
      FROM tracked_urls t
      JOIN users u ON u.id = t.user_id
      WHERE u.email = $1 AND t.active = TRUE
      ORDER BY t.created_at DESC;
    `,
    [email.trim().toLowerCase()]
  );

  return rows.rows.map((row) => ({
    id: Number(row.id),
    url: row.url,
    createdAt: row.created_at
  }));
}

export async function addTrackedUrlByEmail(email: string, url: string) {
  await ensureSchema();
  const db = getPool();
  const normalized = normalizeUrl(url);
  const sub = await findActiveSubscriptionByEmail(email);

  if (!sub || !sub.active) {
    throw new Error("Active subscription required to track URLs.");
  }

  const maxUrls = sub.plan === "unlimited" ? Number.POSITIVE_INFINITY : 10;
  const user = await getOrCreateUser(email, sub.plan);

  if (Number.isFinite(maxUrls)) {
    const count = await db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM tracked_urls WHERE user_id = $1 AND active = TRUE",
      [user.id]
    );

    if (Number(count.rows[0].count) >= maxUrls) {
      throw new Error("Starter plan reached the 10 URL limit. Upgrade for unlimited URLs.");
    }
  }

  const inserted = await db.query<{ id: string; url: string; created_at: string }>(
    `
      INSERT INTO tracked_urls(user_id, url, normalized_url, active)
      VALUES($1, $2, $3, TRUE)
      ON CONFLICT(user_id, normalized_url)
      DO UPDATE SET active = TRUE
      RETURNING id, url, created_at;
    `,
    [user.id, normalized, normalized]
  );

  return {
    id: Number(inserted.rows[0].id),
    url: inserted.rows[0].url,
    createdAt: inserted.rows[0].created_at
  };
}

export async function removeTrackedUrlByEmail(email: string, urlId: number) {
  await ensureSchema();
  const db = getPool();
  const user = await db.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email.trim().toLowerCase()]);

  if (!user.rowCount) {
    return false;
  }

  const result = await db.query("UPDATE tracked_urls SET active = FALSE WHERE id = $1 AND user_id = $2", [
    urlId,
    Number(user.rows[0].id)
  ]);

  return result.rowCount > 0;
}

export type WeeklyAuditInsert = {
  trackedUrlId: number;
  runWeek: string;
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  rawJson?: unknown;
};

export async function upsertAuditRun(payload: WeeklyAuditInsert) {
  await ensureSchema();
  const db = getPool();

  await db.query(
    `
      INSERT INTO audit_runs(tracked_url_id, run_week, performance, accessibility, seo, best_practices, raw_json)
      VALUES($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT(tracked_url_id, run_week)
      DO UPDATE SET
        performance = EXCLUDED.performance,
        accessibility = EXCLUDED.accessibility,
        seo = EXCLUDED.seo,
        best_practices = EXCLUDED.best_practices,
        raw_json = EXCLUDED.raw_json;
    `,
    [
      payload.trackedUrlId,
      payload.runWeek,
      payload.performance,
      payload.accessibility,
      payload.seo,
      payload.bestPractices,
      payload.rawJson ? JSON.stringify(payload.rawJson) : null
    ]
  );
}

export async function getLatestTwoAuditRunsForUrl(trackedUrlId: number) {
  await ensureSchema();
  const db = getPool();
  const rows = await db.query<{
    run_week: string;
    performance: number;
    accessibility: number;
    seo: number;
    best_practices: number;
    created_at: string;
  }>(
    `
      SELECT run_week, performance, accessibility, seo, best_practices, created_at
      FROM audit_runs
      WHERE tracked_url_id = $1
      ORDER BY run_week DESC
      LIMIT 2;
    `,
    [trackedUrlId]
  );

  return rows.rows.map((row) => ({
    runWeek: row.run_week,
    performance: Number(row.performance),
    accessibility: Number(row.accessibility),
    seo: Number(row.seo),
    bestPractices: Number(row.best_practices),
    createdAt: row.created_at
  }));
}

export async function getDashboardReportByEmail(email: string) {
  const urls = await listTrackedUrlsByEmail(email);
  const reportRows = await Promise.all(
    urls.map(async (urlRow) => {
      const runs = await getLatestTwoAuditRunsForUrl(urlRow.id);
      const current = runs[0] ?? null;
      const previous = runs[1] ?? null;

      return {
        trackedUrlId: urlRow.id,
        url: urlRow.url,
        current,
        previous
      };
    })
  );

  return reportRows;
}

export async function getWeeklyCronTargets() {
  await ensureSchema();
  const db = getPool();
  const rows = await db.query<{
    user_id: string;
    email: string;
    plan: PlanName;
    tracked_url_id: string;
    url: string;
  }>(
    `
      SELECT u.id AS user_id, u.email, s.plan, t.id AS tracked_url_id, t.url
      FROM users u
      JOIN subscriptions s ON s.user_id = u.id
      JOIN tracked_urls t ON t.user_id = u.id
      WHERE t.active = TRUE
      AND s.status IN ('active', 'on_trial')
      ORDER BY u.email ASC, t.created_at ASC;
    `
  );

  const users = new Map<
    string,
    { userId: number; email: string; plan: PlanName; urls: Array<{ trackedUrlId: number; url: string }> }
  >();

  for (const row of rows.rows) {
    const key = row.email;
    if (!users.has(key)) {
      users.set(key, {
        userId: Number(row.user_id),
        email: row.email,
        plan: row.plan,
        urls: []
      });
    }

    users.get(key)?.urls.push({
      trackedUrlId: Number(row.tracked_url_id),
      url: row.url
    });
  }

  return [...users.values()];
}

export async function getPreviousAuditBeforeWeek(trackedUrlId: number, week: string) {
  await ensureSchema();
  const db = getPool();
  const row = await db.query<{
    run_week: string;
    performance: number;
    accessibility: number;
    seo: number;
    best_practices: number;
  }>(
    `
      SELECT run_week, performance, accessibility, seo, best_practices
      FROM audit_runs
      WHERE tracked_url_id = $1 AND run_week < $2
      ORDER BY run_week DESC
      LIMIT 1;
    `,
    [trackedUrlId, week]
  );

  if (!row.rowCount) {
    return null;
  }

  const item = row.rows[0];
  return {
    runWeek: item.run_week,
    performance: Number(item.performance),
    accessibility: Number(item.accessibility),
    seo: Number(item.seo),
    bestPractices: Number(item.best_practices)
  };
}

export async function getLastCronWeek() {
  await ensureSchema();
  const db = getPool();
  const result = await db.query<{ value: string }>("SELECT value FROM app_state WHERE key = 'last_cron_week'");
  return result.rowCount ? result.rows[0].value : null;
}

export async function setLastCronWeek(week: string) {
  await ensureSchema();
  const db = getPool();
  await db.query(
    `
      INSERT INTO app_state(key, value, updated_at)
      VALUES('last_cron_week', $1, NOW())
      ON CONFLICT(key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    `,
    [week]
  );
}
