import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/auth/session";
import { getClassification } from "@/lib/db/repository";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const workspace = await getCurrentWorkspace();
  const classification = await getClassification(params.id, workspace.organization.id);

  if (!classification) {
    return NextResponse.json({ error: "Classification not found." }, { status: 404 });
  }

  return NextResponse.json({ classification });
}
