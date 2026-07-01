"use client";

import { type FormEvent, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import type { ApiKeyRecord } from "@/lib/db/domain";

type PublicApiKey = Omit<ApiKeyRecord, "keyHash">;

export function ApiKeyManager({
  initialKeys,
  demoKey
}: {
  initialKeys: PublicApiKey[];
  demoKey?: string;
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [rawKey, setRawKey] = useState<string | null>(demoKey ?? null);
  const [loading, setLoading] = useState(false);

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: String(formData.get("name") ?? "API key") })
    });
    const payload = await response.json();
    setLoading(false);

    if (response.ok) {
      setRawKey(payload.raw_key);
      setKeys((current) => [
        {
          id: payload.api_key.id,
          organizationId: "",
          name: payload.api_key.name,
          keyPrefix: payload.api_key.key_prefix,
          createdAt: payload.api_key.created_at
        },
        ...current
      ]);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Create API key</h2>
              <p className="mt-1 text-sm text-slate-600">Keys are stored hashed; raw values are only shown once.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={createKey} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Key name</Label>
              <Input id="name" name="name" defaultValue="Growth API test key" />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generate key
            </Button>
          </form>
          {rawKey ? (
            <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-950">Raw key</p>
              <code className="mt-2 block overflow-x-auto rounded bg-white px-3 py-2 text-sm text-slate-950">
                {rawKey}
              </code>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-950">Active keys</h2>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border rounded-md border border-border">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{key.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{key.keyPrefix}...</p>
                </div>
                <p className="text-xs text-slate-500">
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(key.createdAt))}
                </p>
              </div>
            ))}
            {!keys.length ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No API keys yet.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
