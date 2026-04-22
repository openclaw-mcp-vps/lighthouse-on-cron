"use client";

import { useEffect, useState } from "react";

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

interface UrlEntry {
  id: number;
  url: string;
  createdAt: string;
}

interface UrlResponse {
  urls: UrlEntry[];
  limit: number | null;
  count: number;
}

export function UrlManager() {
  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUrls() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/urls", { cache: "no-store" });
      const data = (await response.json()) as UrlResponse | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Failed to fetch URLs");
      }

      setUrls(data.urls);
      setLimit(data.limit);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load URLs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUrls();
  }, []);

  async function addUrl() {
    if (!urlInput.trim()) {
      setError("Please enter a URL.");
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/urls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: urlInput })
      });

      const data = (await response.json()) as UrlResponse | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Could not add URL.");
      }

      setUrls(data.urls);
      setLimit(data.limit);
      setUrlInput("");
      setMessage("URL added. It will be included in the next Sunday audit run.");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not add URL.");
    } finally {
      setPending(false);
    }
  }

  async function removeUrl(id: number) {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/urls", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id })
      });

      const data = (await response.json()) as UrlResponse | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Could not remove URL.");
      }

      setUrls(data.urls);
      setLimit(data.limit);
      setMessage("URL removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove URL.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monitored URLs</CardTitle>
        <CardDescription>
          Add canonical URLs that matter for ranking and revenue. Lighthouse audits run weekly on Sunday.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-3">
          <Label htmlFor="url-input">URL</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="url-input"
              placeholder="https://example.com/pricing"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
            />
            <Button type="button" onClick={addUrl} disabled={pending}>
              Add URL
            </Button>
          </div>

          <p className="text-xs text-zinc-400">
            {limit === null
              ? `${urls.length} URLs tracked (unlimited plan).`
              : `${urls.length}/${limit} URLs used on your current plan.`}
          </p>
          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>

        {loading ? (
          <p className="text-sm text-zinc-400">Loading tracked URLs…</p>
        ) : urls.length === 0 ? (
          <p className="text-sm text-zinc-400">No URLs added yet. Add one to start weekly audits.</p>
        ) : (
          <ul className="space-y-2">
            {urls.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="break-all text-sm font-medium text-zinc-200">{entry.url}</p>
                  <p className="text-xs text-zinc-500">Added {new Date(entry.createdAt).toLocaleString()}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => removeUrl(entry.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
