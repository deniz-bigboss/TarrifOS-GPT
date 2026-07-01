import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ResultView } from "@/components/classification/result-view";
import { getCurrentWorkspace } from "@/lib/auth/session";
import { getClassification } from "@/lib/db/repository";

export default async function ClassificationResultPage({
  params
}: {
  params: { id: string };
}) {
  const workspace = await getCurrentWorkspace();
  const classification = await getClassification(params.id, workspace.organization.id);

  if (!classification) {
    notFound();
  }

  return (
    <AppShell workspace={workspace}>
      <ResultView classification={classification} />
    </AppShell>
  );
}
