"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccessGate() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/access/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = (await response.json()) as { message?: string; error?: string; devCode?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not send access code.");
      }

      setStep("verify");
      setMessage(
        data.devCode
          ? `${data.message ?? "Code sent."} Dev code: ${data.devCode}`
          : (data.message ?? "Check your inbox for a 6-digit code.")
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send code.");
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/access/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code })
      });

      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Invalid code.");
      }

      setMessage(data.message ?? "Access unlocked.");
      router.refresh();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Could not verify code.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unlock your dashboard</CardTitle>
        <CardDescription>
          After checkout, enter the billing email from Stripe to receive a one-time access code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={step === "request" ? requestCode : verifyCode}>
          <div className="space-y-2">
            <Label htmlFor="access-email">Billing email</Label>
            <Input
              id="access-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          {step === "verify" ? (
            <div className="space-y-2">
              <Label htmlFor="access-code">6-digit code</Label>
              <Input
                id="access-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                minLength={6}
                maxLength={6}
                required
              />
            </div>
          ) : null}

          <Button type="submit" disabled={pending}>
            {step === "request" ? "Send access code" : "Verify and enter dashboard"}
          </Button>
        </form>

        {step === "verify" ? (
          <button
            type="button"
            className="mt-4 text-sm text-blue-400 hover:text-blue-300"
            onClick={() => {
              setStep("request");
              setCode("");
            }}
          >
            Use a different email
          </button>
        ) : null}

        {message ? <p className="mt-3 text-sm text-emerald-400">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
