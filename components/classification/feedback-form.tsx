"use client";

import { type FormEvent, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

export function FeedbackForm({ classificationId }: { classificationId: string }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      wasCorrect: formData.get("wasCorrect") === "true",
      actualCode: String(formData.get("actualCode") ?? ""),
      brokerNotes: String(formData.get("brokerNotes") ?? ""),
      shipmentCleared: formData.get("shipmentCleared") === "on",
      delayOccurred: formData.get("delayOccurred") === "on",
      penaltyOccurred: formData.get("penaltyOccurred") === "on"
    };
    const response = await fetch(`/api/classifications/${classificationId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not save feedback.");
      return;
    }

    setSaved(true);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-950">Was this classification accepted by your broker/customs authority?</p>
        <div className="mt-3 flex gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" name="wasCorrect" value="true" defaultChecked />
            Accepted
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" name="wasCorrect" value="false" />
            Corrected
          </label>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="actualCode">Correct code if different</Label>
        <Input id="actualCode" name="actualCode" placeholder="e.g. 6109.10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="brokerNotes">Broker notes</Label>
        <Textarea id="brokerNotes" name="brokerNotes" placeholder="Notes from broker review, clearance, or authority feedback" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="shipmentCleared" />
          Shipment cleared
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="delayOccurred" />
          Delay occurred
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="penaltyOccurred" />
          Penalty/document issue
        </label>
      </div>
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {saved ? (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Feedback saved
        </p>
      ) : null}
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save feedback
      </Button>
    </form>
  );
}
