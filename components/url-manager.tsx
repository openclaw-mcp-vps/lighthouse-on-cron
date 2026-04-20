"use client";

import { useMemo, useState } from "react";
import { Globe2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type UrlItem = {
  id: number;
  url: string;
  createdAt: string;
};

type UrlManagerProps = {
  initialUrls: UrlItem[];
  urlLimit: number;
};

export function UrlManager({ initialUrls, urlLimit }: UrlManagerProps) {
  const [urls, setUrls] = useState(initialUrls);
  const [urlInput, setUrlInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limitLabel = useMemo(() => {
    if (!Number.isFinite(urlLimit)) {
      return "Unlimited";
    }
    return `${urls.length}/${urlLimit}`;
  }, [urlLimit, urls.length]);

  const addUrl = async () => {
    if (!urlInput.trim()) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput })
      });

      const payload = (await response.json()) as { error?: string; item?: UrlItem };
      if (!response.ok || !payload.item) {
        setError(payload.error ?? "Could not add URL.");
        return;
      }

      setUrls((current) => [payload.item as UrlItem, ...current]);
      setUrlInput("");
    } catch {
      setError("Network error while adding URL.");
    } finally {
      setBusy(false);
    }
  };

  const removeUrl = async (id: number) => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/urls", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      const payload = (await response.json()) as { error?: string; ok?: boolean };
      if (!response.ok) {
        setError(payload.error ?? "Could not remove URL.");
        return;
      }

      setUrls((current) => current.filter((item) => item.id !== id));
    } catch {
      setError("Network error while removing URL.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Globe2 size={18} />
            Tracked URLs
          </span>
          <span className="rounded-lg border border-[#2f3947] px-2 py-1 text-xs text-muted">{limitLabel}</span>
        </CardTitle>
        <CardDescription>
          Add pages you care about. Each Sunday we audit these exact URLs and compare against last week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            type="url"
            placeholder="https://example.com/pricing"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
          />
          <Button onClick={addUrl} disabled={busy}>
            <Plus size={16} className="mr-1" />
            Add URL
          </Button>
        </div>

        {error ? <p className="text-sm text-[#f85149]">{error}</p> : null}

        <div className="space-y-2">
          {urls.length === 0 ? (
            <p className="text-sm text-muted">No URLs tracked yet. Add your homepage or money pages first.</p>
          ) : (
            urls.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-[#2f3947] bg-[#0f141b] px-3 py-2"
              >
                <a href={item.url} target="_blank" rel="noreferrer" className="truncate text-sm text-[#58a6ff] hover:underline">
                  {item.url}
                </a>
                <Button variant="ghost" size="sm" onClick={() => removeUrl(item.id)} disabled={busy}>
                  <Trash2 size={15} />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
