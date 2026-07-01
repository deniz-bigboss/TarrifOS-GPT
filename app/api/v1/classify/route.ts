import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authenticateBearerRequest, authenticationErrorResponse } from "@/lib/api/auth";
import { mapIncomingProductPayload } from "@/lib/api/payload";
import { getAnalyticsProvider } from "@/lib/analytics/provider";
import { assertApiAccess, DocumentLimitError, PlanFeatureError, PlanLimitError } from "@/lib/billing/limits";
import { normalizeProductInput } from "@/lib/classification/normalize";
import { runClassificationPipeline } from "@/lib/classification/pipeline";
import { findDuplicateClassification, saveClassification, trackUsageEvent } from "@/lib/db/repository";
import { captureError } from "@/lib/observability/error-tracking";
import { getRateLimitProvider } from "@/lib/rate-limit/provider";

export async function POST(request: Request) {
  const { auth, error } = await authenticateBearerRequest(request);
  if (error || !auth) return authenticationErrorResponse(error);

  try {
    assertApiAccess(auth.organizationPlan, auth.isMockDemo);
    const normalizedInput = normalizeProductInput(mapIncomingProductPayload(await request.json()));
    const duplicate = await findDuplicateClassification(auth.organizationId, normalizedInput);

    if (duplicate) {
      return NextResponse.json({
        classification_id: duplicate.result.id,
        recommended_code: duplicate.result.recommended_code,
        confidence: duplicate.result.confidence,
        confidence_label: duplicate.result.confidence_label,
        human_review_required: duplicate.result.human_review_required,
        alternative_codes: duplicate.result.alternative_codes,
        required_documents: duplicate.result.required_documents,
        restriction_warnings: duplicate.result.restriction_warnings,
        agent_plan: duplicate.result.agent_plan,
        broker_ready_explanation: duplicate.result.broker_ready_explanation,
        disclaimer: duplicate.result.disclaimer,
        cache_hit: true
      });
    }

    await getRateLimitProvider().assertClassificationAllowed(auth.organizationId);
    const { result } = await runClassificationPipeline(normalizedInput, {
      organizationId: auth.organizationId
    });
    const saved = await saveClassification(auth.organizationId, "api", normalizedInput, result);
    await trackUsageEvent(
      auth.organizationId,
      "api.classification.created",
      1,
      { classification_id: saved.result.id },
      auth.apiKey.id
    );
    await getAnalyticsProvider().track("classification_completed", {
      organizationId: auth.organizationId,
      classificationId: saved.result.id,
      source: "api"
    });

    return NextResponse.json({
      classification_id: saved.result.id,
      recommended_code: saved.result.recommended_code,
      confidence: saved.result.confidence,
      confidence_label: saved.result.confidence_label,
      human_review_required: saved.result.human_review_required,
      alternative_codes: saved.result.alternative_codes,
      required_documents: saved.result.required_documents,
      restriction_warnings: saved.result.restriction_warnings,
      agent_plan: saved.result.agent_plan,
      broker_ready_explanation: saved.result.broker_ready_explanation,
      disclaimer: saved.result.disclaimer
    });
  } catch (caught) {
    if (caught instanceof ZodError) {
      return NextResponse.json({ error: caught.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    if (caught instanceof PlanLimitError) {
      return NextResponse.json({ error: caught.message }, { status: 402 });
    }

    if (caught instanceof PlanFeatureError) {
      return NextResponse.json({ error: caught.message }, { status: 403 });
    }

    if (caught instanceof DocumentLimitError) {
      return NextResponse.json({ error: caught.message }, { status: 413 });
    }

    await captureError(caught, { route: "POST /api/v1/classify" });

    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Classification failed." }, { status: 500 });
  }
}
