import { Badge } from "@/components/ui/badge";

export function ConfidenceBadge({
  label,
  confidence
}: {
  label: string;
  confidence: number;
}) {
  const tone = label === "high" ? "green" : label === "medium" ? "amber" : "red";

  return (
    <div className="flex min-w-36 items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-blue-600"
          style={{ width: `${Math.round(confidence * 100)}%` }}
        />
      </div>
      <Badge tone={tone}>{label}</Badge>
    </div>
  );
}
