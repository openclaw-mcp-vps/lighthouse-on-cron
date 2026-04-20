"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck, TimerReset, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

declare global {
  interface Window {
    LemonSqueezy?: {
      Url?: {
        Open: (url: string) => void;
      };
    };
  }
}

type PlanKey = "starter" | "unlimited";

function buildCheckoutUrl(baseCheckoutId: string, email: string, plan: PlanKey) {
  const checkoutUrl = baseCheckoutId.startsWith("http")
    ? baseCheckoutId
    : `https://app.lemonsqueezy.com/checkout/buy/${baseCheckoutId}`;

  const url = new URL(checkoutUrl);
  if (email) {
    url.searchParams.set("checkout[email]", email);
    url.searchParams.set("checkout[custom][email]", email);
  }
  url.searchParams.set("checkout[custom][plan]", plan);
  return url.toString();
}

export function Pricing() {
  const [email, setEmail] = useState("");
  const [unlockEmail, setUnlockEmail] = useState("");
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const starterCheckoutId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID ?? "";
  const unlimitedCheckoutId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_UNLIMITED_PRODUCT_ID ?? starterCheckoutId;

  const canCheckout = useMemo(() => !!starterCheckoutId, [starterCheckoutId]);

  const openCheckout = (plan: PlanKey) => {
    if (!canCheckout) {
      setNotice("Set NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID to enable checkout.");
      return;
    }

    setBusyPlan(plan);
    const checkoutId = plan === "starter" ? starterCheckoutId : unlimitedCheckoutId;
    const url = buildCheckoutUrl(checkoutId, email.trim().toLowerCase(), plan);

    if (window.LemonSqueezy?.Url?.Open) {
      window.LemonSqueezy.Url.Open(url);
    } else {
      window.location.href = url;
    }

    setTimeout(() => setBusyPlan(null), 500);
  };

  const unlockAccess = async () => {
    setUnlocking(true);
    setNotice(null);

    try {
      const response = await fetch("/api/access/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: unlockEmail })
      });

      const payload = (await response.json()) as { error?: string; ok?: boolean };
      if (!response.ok) {
        setNotice(payload.error ?? "Unable to verify subscription.");
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setNotice("Network error while verifying your purchase.");
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="space-y-8" id="pricing">
      <Card className="border-[#2ea04355] bg-[#10201a]">
        <CardHeader>
          <CardTitle className="text-2xl">Start with one email, get weekly reports forever</CardTitle>
          <CardDescription>
            Use the same email at checkout and for unlock. Reports are sent to this address every Sunday.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Input
              type="email"
              placeholder="you@youragency.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <div className="text-xs text-muted">Checkout pre-fills from this email.</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="reveal-up">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-xl">
              Starter
              <span className="text-[#3fb950]">$9/mo</span>
            </CardTitle>
            <CardDescription>Perfect for founders watching their top pages and conversion funnel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p className="flex items-center gap-2"><CheckCircle2 size={16} />Track up to 10 URLs</p>
            <p className="flex items-center gap-2"><TimerReset size={16} />Weekly Sunday audit + email digest</p>
            <p className="flex items-center gap-2"><ShieldCheck size={16} />Regression alerts when scores dip</p>
            <Button className="mt-2 w-full" onClick={() => openCheckout("starter")} disabled={busyPlan === "starter"}>
              {busyPlan === "starter" ? "Opening checkout..." : "Start Starter Plan"}
            </Button>
          </CardContent>
        </Card>

        <Card className="glow reveal-up" style={{ animationDelay: "90ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-xl">
              Unlimited
              <span className="text-[#3fb950]">$29/mo</span>
            </CardTitle>
            <CardDescription>For agencies managing many domains and landing-page experiments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p className="flex items-center gap-2"><CheckCircle2 size={16} />Unlimited URLs across client sites</p>
            <p className="flex items-center gap-2"><Zap size={16} />Priority regression alerts and trend tracking</p>
            <p className="flex items-center gap-2"><TimerReset size={16} />Same weekly cadence, more coverage</p>
            <Button className="mt-2 w-full" onClick={() => openCheckout("unlimited")} disabled={busyPlan === "unlimited"}>
              {busyPlan === "unlimited" ? "Opening checkout..." : "Choose Unlimited"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Already paid?</CardTitle>
          <CardDescription>
            Enter your checkout email to unlock your dashboard cookie on this browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              type="email"
              placeholder="checkout-email@company.com"
              value={unlockEmail}
              onChange={(event) => setUnlockEmail(event.target.value)}
            />
            <Button variant="secondary" onClick={unlockAccess} disabled={unlocking}>
              {unlocking ? "Verifying..." : "Unlock Dashboard"}
            </Button>
          </div>
          {notice ? <p className="text-sm text-[#f85149]">{notice}</p> : null}
          <p className="text-xs text-muted">
            Need help after purchase? Email support and include your Lemon Squeezy order receipt email.
          </p>
          <Link href="/dashboard" className="text-sm text-[#58a6ff] hover:underline">
            Go to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
