import { AlertTriangle, CheckCircle2, FileText, HelpCircle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { StoredClassification } from "@/types/classification";
import { ConfidenceBadge } from "./confidence";
import { ExportButtons } from "./export-buttons";
import { FeedbackForm } from "./feedback-form";

function ListBlock({
  title,
  values,
  empty,
  icon
}: {
  title: string;
  values: string[];
  empty: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          {icon}
        </div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </CardHeader>
      <CardContent>
        {values.length ? (
          <ul className="space-y-2">
            {values.map((value) => (
              <li key={value} className="rounded-md border border-border bg-slate-50 p-3 text-sm text-slate-700">
                {value}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ResultView({ classification }: { classification: StoredClassification }) {
  const { request, result } = classification;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">{request.productName}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            Recommended code {result.recommended_code}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{result.recommended_title}</p>
        </div>
        <ExportButtons classification={classification} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Confidence score</p>
              <p className="mt-2 text-4xl font-semibold text-slate-950">{Math.round(result.confidence * 100)}%</p>
            </div>
            <ConfidenceBadge confidence={result.confidence} label={result.confidence_label} />
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-700">{result.reasoning_summary}</p>
            <div className="mt-5 rounded-md border border-border bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-950">Duty/tax estimate placeholder</p>
              <p className="mt-2">{result.duty_rate_placeholder}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={result.human_review_required ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}>
          <CardHeader>
            <div className="flex items-center gap-3">
              {result.human_review_required ? (
                <ShieldAlert className="h-6 w-6 text-amber-700" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-700" />
              )}
              <h2 className="text-base font-semibold text-slate-950">Human review</h2>
            </div>
          </CardHeader>
          <CardContent>
            <Badge tone={result.human_review_required ? "amber" : "green"}>
              {result.human_review_required ? "required" : "not automatically required"}
            </Badge>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              {result.human_review_required
                ? result.human_review_reason || "Confidence or risk rules require broker review."
                : "A broker or customs professional should still confirm before filing."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-950">Alternative candidates</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-2">
            {result.alternative_codes.length ? (
              result.alternative_codes.map((candidate) => (
                <div key={candidate.code} className="rounded-md border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-sm font-semibold text-slate-950">{candidate.code}</p>
                    <Badge>{Math.round(candidate.confidence * 100)}%</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{candidate.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{candidate.reason}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No alternative candidates were returned.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListBlock title="Key classification factors" values={result.key_factors} empty="No factors provided." icon={<FileText className="h-4 w-4" />} />
        <ListBlock title="Missing information" values={result.missing_information} empty="No missing information flagged." icon={<HelpCircle className="h-4 w-4" />} />
        <ListBlock title="Required documents" values={result.required_documents} empty="No required documents found." icon={<FileText className="h-4 w-4" />} />
        <ListBlock title="Restrictions and warnings" values={result.restriction_warnings} empty="No restricted-goods warning found in seed data." icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-950">Broker-ready explanation</h2>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-line text-sm leading-7 text-slate-700">{result.broker_ready_explanation}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-950">Feedback and learning loop</h2>
          <p className="mt-1 text-sm text-slate-600">Save broker or authority outcomes to improve future review data.</p>
        </CardHeader>
        <CardContent>
          <FeedbackForm classificationId={result.id} />
        </CardContent>
      </Card>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        {result.disclaimer}
      </div>
    </div>
  );
}
