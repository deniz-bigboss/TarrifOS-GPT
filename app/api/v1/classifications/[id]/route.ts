import { NextResponse } from "next/server";
import { authenticateBearerRequest, authenticationErrorResponse } from "@/lib/api/auth";
import { assertApiAccess, PlanFeatureError } from "@/lib/billing/limits";
import { getClassification, trackUsageEvent } from "@/lib/db/repository";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { auth, error } = await authenticateBearerRequest(request);
  if (error || !auth) return authenticationErrorResponse(error);

  try {
    assertApiAccess(auth.organizationPlan, auth.isMockDemo);
  } catch (caught) {
    if (caught instanceof PlanFeatureError) {
      return NextResponse.json({ error: caught.message }, { status: 403 });
    }

    throw caught;
  }

  const classification = await getClassification(params.id, auth.organizationId);

  if (!classification) {
    return NextResponse.json({ error: "Classification not found." }, { status: 404 });
  }

  await trackUsageEvent(auth.organizationId, "api.classification.read", 1, {
    classification_id: params.id
  }, auth.apiKey.id);

  return NextResponse.json({ classification });
}
