import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authenticateBearerRequest, authenticationErrorResponse } from "@/lib/api/auth";
import { assertApiAccess, PlanFeatureError } from "@/lib/billing/limits";
import { saveFeedback, trackUsageEvent } from "@/lib/db/repository";
import { feedbackSchema } from "@/lib/validation/classification";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { auth, error } = await authenticateBearerRequest(request);
  if (error || !auth) return authenticationErrorResponse(error);

  try {
    assertApiAccess(auth.organizationPlan, auth.isMockDemo);
    const feedback = feedbackSchema.parse(await request.json());
    const saved = await saveFeedback(auth.organizationId, params.id, feedback);
    await trackUsageEvent(
      auth.organizationId,
      "api.feedback.created",
      1,
      { classification_id: params.id },
      auth.apiKey.id
    );

    return NextResponse.json({ feedback: saved });
  } catch (caught) {
    if (caught instanceof ZodError) {
      return NextResponse.json({ error: caught.issues[0]?.message ?? "Invalid feedback." }, { status: 400 });
    }

    if (caught instanceof PlanFeatureError) {
      return NextResponse.json({ error: caught.message }, { status: 403 });
    }

    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Feedback failed." }, { status: 500 });
  }
}
