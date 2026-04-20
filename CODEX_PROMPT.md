# Build Task: lighthouse-on-cron

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: lighthouse-on-cron
HEADLINE: Lighthouse on Cron — weekly Core Web Vitals reports for all your URLs
WHAT: Paste URLs or connect domains. Every Sunday you get an email with Lighthouse scores (perf, a11y, SEO, best-practices) + regression alerts vs last week.
WHY: Google does this for top sites but not yours. Running Lighthouse manually = chore. $9/mo for automated + alerts = clear win.
WHO PAYS: SEO-focused indie founders and agencies
NICHE: performance
PRICE: $$9/mo for 10 URLs, $29/mo unlimited/mo

ARCHITECTURE SPEC:
A Next.js app with cron jobs that runs weekly Lighthouse audits on user URLs, stores results in a database, and sends email reports with performance regression alerts. Uses Lemon Squeezy for subscriptions and Resend for email delivery.

PLANNED FILES:
- app/page.tsx
- app/dashboard/page.tsx
- app/api/webhooks/lemonsqueezy/route.ts
- app/api/cron/lighthouse/route.ts
- components/url-manager.tsx
- components/lighthouse-report.tsx
- lib/lighthouse.ts
- lib/email.ts
- lib/db.ts
- prisma/schema.prisma
- emails/weekly-report.tsx

DEPENDENCIES: next, tailwindcss, prisma, @prisma/client, lighthouse, chrome-launcher, resend, @react-email/components, @lemonsqueezy/lemonsqueezy.js, recharts, lucide-react

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Lemon Squeezy checkout overlay for payments
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}
- NO HEAVY ORMs: Do NOT use Prisma, Drizzle, TypeORM, Sequelize, or Mongoose. If the tool needs persistence, use direct SQL via `pg` (Postgres) or `better-sqlite3` (local), or just filesystem JSON. Reason: these ORMs require schema files and codegen steps that fail on Vercel when misconfigured.
- INTERNAL FILE DISCIPLINE: Every internal import (paths starting with `@/`, `./`, or `../`) MUST refer to a file you actually create in this build. If you write `import { Card } from "@/components/ui/card"`, then `components/ui/card.tsx` MUST exist with a real `export const Card` (or `export default Card`). Before finishing, scan all internal imports and verify every target file exists. Do NOT use shadcn/ui patterns unless you create every component from scratch — easier path: write all UI inline in the page that uses it.
- DEPENDENCY DISCIPLINE: Every package imported in any .ts, .tsx, .js, or .jsx file MUST be
  listed in package.json dependencies (or devDependencies for build-only). Before finishing,
  scan all source files for `import` statements and verify every external package (anything
  not starting with `.` or `@/`) appears in package.json. Common shadcn/ui peers that MUST
  be added if used:
  - lucide-react, clsx, tailwind-merge, class-variance-authority
  - react-hook-form, zod, @hookform/resolvers
  - @radix-ui/* (for any shadcn component)
- After running `npm run build`, if you see "Module not found: Can't resolve 'X'", add 'X'
  to package.json dependencies and re-run npm install + npm run build until it passes.

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
- NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID
- LEMON_SQUEEZY_WEBHOOK_SECRET

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.
