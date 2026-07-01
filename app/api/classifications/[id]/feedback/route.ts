import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentWorkspace } from "@/lib/auth/session";
import { getAnalyticsProvider } from "@/lib/analytics/provider";
import { saveFeedback, trackUsageEvent } from "@/lib/db/repository";
import { feedbackSchema } from "@/lib/validation/classification";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workspace = await getCurrentWorkspace();
    const payload = feedbackSchema.parse(await request.json());
    const feedback = await saveFeedback(workspace.organization.id, params.id, payload);
    await trackUsageEvent(workspace.organization.id, "ui.feedback.created", 1, {
      classification_id: params.id
    });
    await getAnalyticsProvider().track("feedback_submitted", {
      organizationId: workspace.organization.id,
      classificationId: params.id
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid feedback." }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Feedback failed." }, { status: 500 });
  }
}
