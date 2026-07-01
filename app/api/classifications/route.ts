import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getOptionalWorkspace } from "@/lib/auth/session";
import { getAnalyticsProvider } from "@/lib/analytics/provider";
import { normalizeProductInput } from "@/lib/classification/normalize";
import { runClassificationPipeline } from "@/lib/classification/pipeline";
import { findDuplicateClassification, listClassifications, saveClassification, trackUsageEvent } from "@/lib/db/repository";
import { DocumentLimitError, PlanLimitError } from "@/lib/billing/limits";
import { captureError } from "@/lib/observability/error-tracking";
import { getRateLimitProvider } from "@/lib/rate-limit/provider";

export async function GET() {
  const workspace = await getOptionalWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const classifications = await listClassifications(workspace.organization.id);
  return NextResponse.json({ classifications });
}

export async function POST(request: Request) {
  try {
    const workspace = await getOptionalWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const normalizedInput = normalizeProductInput(body);
    const duplicate = await findDuplicateClassification(workspace.organization.id, normalizedInput);

    if (duplicate) {
      return NextResponse.json({
        classification_id: duplicate.result.id,
        recommended_code: duplicate.result.recommended_code,
        confidence: duplicate.result.confidence,
        confidence_label: duplicate.result.confidence_label,
        human_review_required: duplicate.result.human_review_required,
        cache_hit: true
      });
    }

    await getRateLimitProvider().assertClassificationAllowed(workspace.organization.id);
    const { result } = await runClassificationPipeline(normalizedInput, {
      organizationId: workspace.organization.id
    });
    const saved = await saveClassification(workspace.organization.id, workspace.userId, normalizedInput, result);
    await trackUsageEvent(workspace.organization.id, "ui.classification.created", 1, {
      classification_id: saved.result.id
    });
    await getAnalyticsProvider().track("classification_completed", {
      organizationId: workspace.organization.id,
      classificationId: saved.result.id
    });

    return NextResponse.json({
      classification_id: saved.result.id,
      recommended_code: saved.result.recommended_code,
      confidence: saved.result.confidence,
      confidence_label: saved.result.confidence_label,
      human_review_required: saved.result.human_review_required
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }

    if (error instanceof DocumentLimitError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }

    await captureError(error, { route: "POST /api/classifications" });

    return NextResponse.json({ error: error instanceof Error ? error.message : "Classification failed." }, { status: 500 });
  }
}
