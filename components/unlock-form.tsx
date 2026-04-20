"use client";

import { useState, useTransition } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function UnlockForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unlock = () => {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/paywall/unlock", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const payload = (await response.json()) as { error?: string; success?: boolean };
      if (!response.ok || !payload.success) {
        setError(payload.error ?? "Could not verify this email.");
        return;
      }

      window.location.reload();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#f0f6fc]">
          <LockKeyhole className="h-4 w-4 text-[#58a6ff]" />
          Unlock your dashboard
        </CardTitle>
        <CardDescription>
          Use the same email you used at checkout. We&apos;ll validate your active subscription and set an access cookie.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="founder@yourdomain.com"
          />
          <Button type="button" onClick={unlock} disabled={isPending || !email.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Verify and Unlock
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-[#ff7b72]">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
