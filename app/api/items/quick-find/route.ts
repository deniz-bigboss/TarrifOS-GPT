import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalWorkspace } from "@/lib/auth/session";
import { quickFindItem } from "@/lib/item-detector/quick-find";
import { captureError } from "@/lib/observability/error-tracking";

const quickFindSchema = z.object({
  query: z.string().trim().min(3).max(160)
});

export async function POST(request: Request) {
  try {
    const workspace = await getOptionalWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const payload = quickFindSchema.parse(await request.json());
    const item = await quickFindItem(payload.query);

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid quick-find query." }, { status: 400 });
    }

    await captureError(error, { route: "POST /api/items/quick-find" });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Quick item lookup failed." },
      { status: 500 }
    );
  }
}
