import { NextResponse } from "next/server";
import { getOptionalWorkspace } from "@/lib/auth/session";
import { getClassification } from "@/lib/db/repository";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const workspace = await getOptionalWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const classification = await getClassification(params.id, workspace.organization.id);

  if (!classification) {
    return NextResponse.json({ error: "Classification not found." }, { status: 404 });
  }

  return NextResponse.json({ classification });
}
