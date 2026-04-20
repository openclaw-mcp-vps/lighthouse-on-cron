# Lighthouse on Cron

Lighthouse on Cron is a Next.js 15 App Router application that runs weekly Lighthouse audits for paid users and emails Sunday score summaries with regression alerts.

## What it does

- Landing page with conversion-focused messaging and Lemon Squeezy checkout overlay
- Cookie-gated dashboard behind a paid subscription check
- URL manager to add/remove tracked pages
- Weekly report viewer (performance, accessibility, SEO, best-practices)
- Lemon Squeezy webhook ingestion for subscription activation
- Sunday cron endpoint to run Lighthouse, persist scores, compare with prior week, and send Resend emails
- Health endpoint at `/api/health`

## Stack

- Next.js 15 + App Router + TypeScript
- Tailwind CSS v4
- Direct Postgres SQL via `pg` (no ORM)
- Lighthouse + chrome-launcher for audits
- Lemon Squeezy for billing
- Resend for email delivery

## Environment variables

Copy `.env.example` and configure values:

- `NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID`
- `NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID`
- `LEMON_SQUEEZY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_LEMON_SQUEEZY_UNLIMITED_PRODUCT_ID` (optional)
- `LEMON_SQUEEZY_API_KEY` (optional, only for SDK initialization)
- `DATABASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ACCESS_TOKEN_SECRET`
- `CRON_SECRET`

## Local run

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run start
```

## Endpoints

- `GET /api/health` -> `{"status":"ok"}`
- `POST /api/webhooks/lemon-squeezy` -> subscription webhook ingestion
- `POST /api/access/grant` -> verifies active subscription by email and sets access cookie
- `POST /api/access/logout` -> clears access cookie
- `GET/POST/DELETE /api/urls` -> manage tracked URLs (auth required)
- `GET /api/reports` -> dashboard report data (auth required)
- `GET/POST /api/cron/lighthouse` -> weekly Lighthouse run (optional Bearer `CRON_SECRET`)

## Cron setup

Schedule `GET https://your-domain.com/api/cron/lighthouse` every Sunday (UTC). Add header:

- `Authorization: Bearer <CRON_SECRET>`

Use `?force=1` for manual runs outside Sunday.
