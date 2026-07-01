import { AlertTriangle, BarChart3, FileSearch, Gauge, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ClassificationsTable } from "@/components/classification/classifications-table";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentWorkspace } from "@/lib/auth/session";
import { getDashboardMetrics } from "@/lib/db/repository";

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();
  const metrics = await getDashboardMetrics(workspace.organization.id);

  return (
    <AppShell workspace={workspace}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">{workspace.organization.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Dashboard</h1>
        </div>
        <ButtonLink href="/dashboard/classify">
          <Sparkles className="h-4 w-4" />
          Create shipment plan
        </ButtonLink>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Shipment plans" value={metrics.totalClassifications} icon={<FileSearch className="h-5 w-5" />} />
        <MetricCard label="High confidence" value={metrics.highConfidence} icon={<Gauge className="h-5 w-5" />} />
        <MetricCard label="Needs review" value={metrics.needsReview} icon={<AlertTriangle className="h-5 w-5" />} />
        <MetricCard label="API usage" value={metrics.apiUsage} icon={<BarChart3 className="h-5 w-5" />} />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Recent shipment plans</h2>
          <ButtonLink href="/classifications" variant="outline" size="sm">View all</ButtonLink>
        </div>
        <ClassificationsTable data={metrics.recentClassifications} />
      </section>
    </AppShell>
  );
}
