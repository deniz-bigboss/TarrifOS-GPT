import { AppShell } from "@/components/layout/app-shell";
import { ClassificationsTable } from "@/components/classification/classifications-table";
import { ButtonLink } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { getCurrentWorkspace } from "@/lib/auth/session";
import { listClassifications } from "@/lib/db/repository";

export default async function ClassificationsPage({
  searchParams
}: {
  searchParams?: {
    destinationCountry?: string;
    confidence?: string;
    humanReviewRequired?: string;
    category?: string;
  };
}) {
  const workspace = await getCurrentWorkspace();
  const classifications = await listClassifications(workspace.organization.id, {
    destinationCountry: searchParams?.destinationCountry || undefined,
    confidence: searchParams?.confidence || undefined,
    humanReviewRequired:
      searchParams?.humanReviewRequired === "true"
        ? true
        : searchParams?.humanReviewRequired === "false"
          ? false
          : undefined,
    category: searchParams?.category || undefined
  });

  return (
    <AppShell workspace={workspace}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">Classifications</h1>
          <p className="mt-2 text-sm text-slate-600">Filter previous classification results by lane, confidence, review state, or category.</p>
        </div>
        <ButtonLink href="/dashboard/classify">New request</ButtonLink>
      </div>

      <form className="mt-6 grid gap-4 rounded-lg border border-border bg-white p-4 shadow-sm md:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="destinationCountry">Destination</Label>
          <Input id="destinationCountry" name="destinationCountry" placeholder="DE" defaultValue={searchParams?.destinationCountry ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confidence">Confidence</Label>
          <Select id="confidence" name="confidence" defaultValue={searchParams?.confidence ?? ""}>
            <option value="">Any</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="humanReviewRequired">Review</Label>
          <Select id="humanReviewRequired" name="humanReviewRequired" defaultValue={searchParams?.humanReviewRequired ?? ""}>
            <option value="">Any</option>
            <option value="true">Needs review</option>
            <option value="false">Standard</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" placeholder="apparel" defaultValue={searchParams?.category ?? ""} />
        </div>
        <div className="flex items-end">
          <button className="h-10 w-full rounded-md bg-slate-950 px-4 text-sm font-medium text-white" type="submit">
            Apply filters
          </button>
        </div>
      </form>

      <div className="mt-6">
        <ClassificationsTable data={classifications} />
      </div>
    </AppShell>
  );
}
