import { AppShell } from "@/components/layout/app-shell";
import { ClassificationWizard } from "@/components/classification/classification-wizard";
import { getCurrentWorkspace } from "@/lib/auth/session";
import { BadgeCheck, Database, ShieldCheck } from "lucide-react";

const pageHighlights = [
  { icon: Database, label: "Seed tariff data", value: "EU/US demo catalog" },
  { icon: ShieldCheck, label: "Risk checks", value: "Flags review cases" },
  { icon: BadgeCheck, label: "Saved result", value: "Audit-ready record" }
];

export default async function NewClassificationPage() {
  const workspace = await getCurrentWorkspace();

  return (
    <AppShell workspace={workspace}>
      <div className="mb-7 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-7">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Structured classification workflow</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">Create classification request</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Capture the product facts, trade lane, and supporting documents needed for a broker-ready tariff recommendation.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {pageHighlights.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-950">{label}</span>
                  <span className="block text-xs text-slate-500">{value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ClassificationWizard />
    </AppShell>
  );
}
