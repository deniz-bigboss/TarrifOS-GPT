import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileCheck2,
  HelpCircle,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type {
  AgentPriority,
  ShippingAgentAction,
  ShippingAgentPlan,
  ShippingDocumentChecklistItem
} from "@/types/classification";

const priorityTone: Record<AgentPriority, "red" | "amber" | "blue" | "neutral"> = {
  critical: "red",
  high: "amber",
  medium: "blue",
  low: "neutral"
};

const readinessCopy: Record<ShippingAgentPlan["readiness_label"], string> = {
  blocked: "Blocked",
  needs_work: "Needs work",
  ready_with_review: "Ready with review",
  ready: "Ready"
};

function ActionItem({ action }: { action: ShippingAgentAction }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-sm font-semibold text-slate-950">{action.title}</h3>
        <Badge tone={priorityTone[action.priority]} className="shrink-0">
          {action.priority}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <p>
          <span className="font-semibold text-slate-800">Owner:</span> {action.owner}
        </p>
        <p>
          <span className="font-semibold text-slate-800">Timing:</span> {action.timeline}
        </p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{action.reason}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-emerald-800">{action.businessImpact}</p>
    </div>
  );
}

function DocumentStatus({ document }: { document: ShippingDocumentChecklistItem }) {
  const tone = document.status === "attached" ? "green" : document.status === "missing" ? "amber" : "blue";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold capitalize text-slate-950">{document.name}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">Owner: {document.owner}</p>
        </div>
        <Badge tone={tone} className="shrink-0">
          {document.status}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{document.reason}</p>
    </div>
  );
}

export function ShippingAgentPlanView({ plan }: { plan?: ShippingAgentPlan }) {
  if (!plan) {
    return null;
  }

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-slate-900 bg-slate-950 text-white">
        <CardHeader className="border-b border-white/10 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-400/15 text-emerald-300">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-300">Shipping operations agent</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">Shipment execution plan</h2>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">{plan.strategic_summary}</p>
              </div>
            </div>
            <div className="shrink-0 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase text-slate-400">Readiness</p>
              <p className="mt-1 text-3xl font-semibold text-white">{plan.readiness_score}%</p>
              <p className="mt-1 text-sm font-medium text-emerald-300">{readinessCopy[plan.readiness_label]}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-6 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Next actions</p>
            <p className="mt-2 text-2xl font-semibold text-white">{plan.next_actions.length}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Document tasks</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {plan.document_checklist.filter((document) => document.status !== "attached").length}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Compliance checkpoints</p>
            <p className="mt-2 text-2xl font-semibold text-white">{plan.compliance_checkpoints.length}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Agent next actions</h2>
              <p className="mt-1 text-sm text-slate-600">Prioritized operating steps for the shipment team.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.next_actions.map((action) => (
              <ActionItem key={`${action.title}-${action.owner}`} action={action} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Document checklist</h2>
              <p className="mt-1 text-sm text-slate-600">What the broker or internal team will ask for.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.document_checklist.map((document) => (
              <DocumentStatus key={document.name} document={document} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Cost-reduction levers</h2>
              <p className="mt-1 text-sm text-slate-600">Actions that can protect margin before shipment movement.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.cost_reduction_actions.map((action) => (
              <ActionItem key={`${action.title}-${action.timeline}`} action={action} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-red-50 text-red-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Compliance checkpoints</h2>
              <p className="mt-1 text-sm text-slate-600">Gates to clear before the shipment is filed.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.compliance_checkpoints.map((checkpoint) => (
              <div key={checkpoint.title} className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-950">{checkpoint.title}</h3>
                  <Badge tone={priorityTone[checkpoint.severity]} className="shrink-0">
                    {checkpoint.severity}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{checkpoint.description}</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-950">{checkpoint.nextStep}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-950">Shipment timeline</h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {plan.shipment_timeline.map((phase) => (
                <div key={phase.phase} className="rounded-md border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-950">{phase.phase}</p>
                  <ul className="mt-3 space-y-2">
                    {phase.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <HelpCircle className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-950">Open questions</h2>
          </CardHeader>
          <CardContent>
            {plan.agent_questions.length ? (
              <ul className="space-y-2">
                {plan.agent_questions.map((question) => (
                  <li key={question} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    {question}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                No additional agent questions were generated from the current inputs.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
