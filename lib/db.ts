import "server-only";

import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

export type PlanType = "starter" | "agency";
export type SubscriberStatus = "active" | "trialing" | "canceled" | "inactive";

export interface Subscriber {
  email: string;
  status: SubscriberStatus;
  plan: PlanType;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoredUrl {
  id: number;
  email: string;
  url: string;
  createdAt: string;
}

export interface AuditSnapshot {
  id: number;
  monitoredUrlId: number;
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
  createdAt: string;
}

export interface ReportRow {
  urlId: number;
  url: string;
  current: AuditSnapshot | null;
  previous: AuditSnapshot | null;
}

interface AuditInput {
  monitoredUrlId: number;
  runWeek: string;
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  lcp?: number | null;
  cls?: number | null;
  tbt?: number | null;
  fcp?: number | null;
  speedIndex?: number | null;
  rawJson?: string | null;
}

const DEFAULT_DB_PATH = process.env.DATABASE_PATH ?? "./data/lighthouse.db";

declare global {
  // eslint-disable-next-line no-var
  var __lighthouseCronDb: Database.Database | undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  parsed.hash = "";

  const serialized = parsed.toString();
  return serialized.endsWith("/") ? serialized.slice(0, -1) : serialized;
}

function rowToSubscriber(row: Record<string, unknown>): Subscriber {
  return {
    email: String(row.email),
    status: row.status as SubscriberStatus,
    plan: row.plan as PlanType,
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function rowToAudit(row: Record<string, unknown>): AuditSnapshot {
  return {
    id: Number(row.id),
    monitoredUrlId: Number(row.monitored_url_id),
    runWeek: String(row.run_week),
    performance: Number(row.performance),
    accessibility: Number(row.accessibility),
    seo: Number(row.seo),
    bestPractices: Number(row.best_practices),
    lcp: row.lcp === null ? null : Number(row.lcp),
    cls: row.cls === null ? null : Number(row.cls),
    tbt: row.tbt === null ? null : Number(row.tbt),
    fcp: row.fcp === null ? null : Number(row.fcp),
    speedIndex: row.speed_index === null ? null : Number(row.speed_index),
    createdAt: String(row.created_at)
  };
}

function initSchema(db: Database.Database) {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS subscribers (
      email TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      plan TEXT NOT NULL,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monitored_urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(email, url),
      FOREIGN KEY(email) REFERENCES subscribers(email)
    );

    CREATE TABLE IF NOT EXISTS audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monitored_url_id INTEGER NOT NULL,
      run_week TEXT NOT NULL,
      performance REAL NOT NULL,
      accessibility REAL NOT NULL,
      seo REAL NOT NULL,
      best_practices REAL NOT NULL,
      lcp REAL,
      cls REAL,
      tbt REAL,
      fcp REAL,
      speed_index REAL,
      raw_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(monitored_url_id) REFERENCES monitored_urls(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS login_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_monitored_urls_email ON monitored_urls(email);
    CREATE INDEX IF NOT EXISTS idx_audits_monitored_url_id ON audits(monitored_url_id);
    CREATE INDEX IF NOT EXISTS idx_login_codes_email ON login_codes(email);
  `);
}

export function getDb() {
  if (global.__lighthouseCronDb) {
    return global.__lighthouseCronDb;
  }

  mkdirSync(dirname(DEFAULT_DB_PATH), { recursive: true });
  const db = new Database(DEFAULT_DB_PATH);
  initSchema(db);
  global.__lighthouseCronDb = db;
  return db;
}

export function getSubscriber(email: string): Subscriber | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM subscribers WHERE email = ?")
    .get(normalizeEmail(email)) as Record<string, unknown> | undefined;

  return row ? rowToSubscriber(row) : null;
}

export function getSubscriberByStripeCustomerId(customerId: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM subscribers WHERE stripe_customer_id = ?")
    .get(customerId) as Record<string, unknown> | undefined;

  return row ? rowToSubscriber(row) : null;
}

export function upsertSubscriber(input: {
  email: string;
  status?: SubscriberStatus;
  plan?: PlanType;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const db = getDb();
  const email = normalizeEmail(input.email);
  const now = nowIso();

  db.prepare(
    `
      INSERT INTO subscribers (
        email,
        status,
        plan,
        stripe_customer_id,
        stripe_subscription_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        status = excluded.status,
        plan = excluded.plan,
        stripe_customer_id = COALESCE(excluded.stripe_customer_id, subscribers.stripe_customer_id),
        stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, subscribers.stripe_subscription_id),
        updated_at = excluded.updated_at
    `
  ).run(
    email,
    input.status ?? "active",
    input.plan ?? "starter",
    input.stripeCustomerId ?? null,
    input.stripeSubscriptionId ?? null,
    now,
    now
  );

  return getSubscriber(email);
}

export function updateSubscriberStatusByCustomerId(customerId: string, status: SubscriberStatus) {
  const db = getDb();
  db.prepare("UPDATE subscribers SET status = ?, updated_at = ? WHERE stripe_customer_id = ?").run(
    status,
    nowIso(),
    customerId
  );
}

export function updateSubscriberStatus(email: string, status: SubscriberStatus) {
  const db = getDb();
  db.prepare("UPDATE subscribers SET status = ?, updated_at = ? WHERE email = ?").run(
    status,
    nowIso(),
    normalizeEmail(email)
  );
}

export function listActiveSubscribers() {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM subscribers WHERE status IN ('active', 'trialing') ORDER BY created_at ASC")
    .all() as Record<string, unknown>[];

  return rows.map(rowToSubscriber);
}

export function listMonitoredUrls(email: string): MonitoredUrl[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM monitored_urls WHERE email = ? ORDER BY created_at ASC")
    .all(normalizeEmail(email)) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: Number(row.id),
    email: String(row.email),
    url: String(row.url),
    createdAt: String(row.created_at)
  }));
}

export function addMonitoredUrl(email: string, url: string) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const normalizedUrl = normalizeUrl(url);

  const subscriber = getSubscriber(normalizedEmail);
  if (!subscriber || !["active", "trialing"].includes(subscriber.status)) {
    throw new Error("An active subscription is required before adding URLs.");
  }

  const countRow = db
    .prepare("SELECT COUNT(*) as count FROM monitored_urls WHERE email = ?")
    .get(normalizedEmail) as { count: number };
  const currentCount = countRow.count;

  if (subscriber.plan === "starter" && currentCount >= 10) {
    throw new Error("Starter plan includes up to 10 URLs. Upgrade to Agency for unlimited URLs.");
  }

  db.prepare(
    "INSERT INTO monitored_urls (email, url, created_at) VALUES (?, ?, ?) ON CONFLICT(email, url) DO NOTHING"
  ).run(normalizedEmail, normalizedUrl, nowIso());

  return listMonitoredUrls(normalizedEmail);
}

export function removeMonitoredUrl(email: string, urlId: number) {
  const db = getDb();
  db.prepare("DELETE FROM monitored_urls WHERE id = ? AND email = ?").run(urlId, normalizeEmail(email));
  return listMonitoredUrls(email);
}

export function getLatestAuditForUrl(monitoredUrlId: number): AuditSnapshot | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM audits WHERE monitored_url_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(monitoredUrlId) as Record<string, unknown> | undefined;

  return row ? rowToAudit(row) : null;
}

export function saveAuditSnapshot(input: AuditInput) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO audits (
        monitored_url_id,
        run_week,
        performance,
        accessibility,
        seo,
        best_practices,
        lcp,
        cls,
        tbt,
        fcp,
        speed_index,
        raw_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    input.monitoredUrlId,
    input.runWeek,
    input.performance,
    input.accessibility,
    input.seo,
    input.bestPractices,
    input.lcp ?? null,
    input.cls ?? null,
    input.tbt ?? null,
    input.fcp ?? null,
    input.speedIndex ?? null,
    input.rawJson ?? null,
    nowIso()
  );
}

export function getLatestReportRows(email: string): ReportRow[] {
  const db = getDb();
  const urls = listMonitoredUrls(email);

  return urls.map((entry) => {
    const rows = db
      .prepare("SELECT * FROM audits WHERE monitored_url_id = ? ORDER BY created_at DESC LIMIT 2")
      .all(entry.id) as Record<string, unknown>[];

    return {
      urlId: entry.id,
      url: entry.url,
      current: rows[0] ? rowToAudit(rows[0]) : null,
      previous: rows[1] ? rowToAudit(rows[1]) : null
    };
  });
}

export function saveLoginCode(email: string, code: string, minutesToLive = 15) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const expiresAt = new Date(Date.now() + minutesToLive * 60_000).toISOString();

  db.prepare("DELETE FROM login_codes WHERE email = ?").run(normalizedEmail);
  db.prepare(
    "INSERT INTO login_codes (email, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).run(normalizedEmail, hashCode(code), expiresAt, nowIso());
}

export function verifyLoginCode(email: string, code: string) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const row = db
    .prepare(
      `
        SELECT *
        FROM login_codes
        WHERE email = ?
          AND used_at IS NULL
          AND expires_at > ?
        ORDER BY created_at DESC
        LIMIT 1
      `
    )
    .get(normalizedEmail, nowIso()) as Record<string, unknown> | undefined;

  if (!row) {
    return false;
  }

  const expected = String(row.code_hash);
  if (expected !== hashCode(code)) {
    return false;
  }

  db.prepare("UPDATE login_codes SET used_at = ? WHERE id = ?").run(nowIso(), Number(row.id));
  return true;
}

export function hashCode(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function isSubscriberActive(status: SubscriberStatus | string | null | undefined) {
  return status === "active" || status === "trialing";
}
