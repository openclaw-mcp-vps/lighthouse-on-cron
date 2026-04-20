"use client";

import { useMemo, useState, useTransition } from "react";
import { Globe, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type UrlItem = {
  id: number;
  url: string;
  createdAt: string;
};

type UrlManagerProps = {
  initialUrls: UrlItem[];
  plan: "starter" | "unlimited";
  urlLimit: number;
};

export function UrlManager({ initialUrls, plan, urlLimit }: UrlManagerProps) {
  const [urls, setUrls] = useState<UrlItem[]>(initialUrls);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const usage = useMemo(() => `${urls.length}/${urlLimit >= 10000 ? "∞" : urlLimit}`, [urls.length, urlLimit]);

  const addUrl = () => {
    setError(null);

    if (!input.trim()) {
      setError("Enter a URL to monitor.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/urls", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ url: input })
      });

      const payload = (await response.json()) as { error?: string; url?: UrlItem };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Could not add URL.");
        return;
      }

      setUrls((previous) => [payload.url as UrlItem, ...previous]);
      setInput("");
    });
  };

  const removeUrl = (urlId: number) => {
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/urls/${urlId}`, {
        method: "DELETE"
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not remove URL.");
        return;
      }

      setUrls((previous) => previous.filter((item) => item.id !== urlId));
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-[#f0f6fc]">URL Manager</CardTitle>
            <CardDescription>Add or remove monitored URLs for weekly audits.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={plan === "unlimited" ? "success" : "secondary"}>
              {plan === "unlimited" ? "Unlimited" : "Starter"}
            </Badge>
            <Badge variant="secondary">Usage {usage}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="https://example.com"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addUrl();
              }
            }}
          />
          <Button type="button" onClick={addUrl} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add URL
          </Button>
        </div>
        {error ? <p className="mb-4 text-sm text-[#ff7b72]">{error}</p> : null}
        {urls.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#30363d] p-6 text-sm text-[#8b949e]">
            No URLs yet. Add at least one URL to include it in Sunday reports.
          </div>
        ) : (
          <ul className="space-y-2">
            {urls.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#30363d] bg-[#0d1117] p-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-[#58a6ff]" />
                  <span className="truncate text-sm text-[#c9d1d9]">{item.url}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeUrl(item.id)} disabled={isPending}>
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
