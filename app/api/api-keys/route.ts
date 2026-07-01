import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/auth/session";
import { getAnalyticsProvider } from "@/lib/analytics/provider";
import { createApiKey, listApiKeys } from "@/lib/db/repository";

export async function GET() {
  const workspace = await getCurrentWorkspace();
  const apiKeys = await listApiKeys(workspace.organization.id);
  return NextResponse.json({ api_keys: apiKeys.map(({ keyHash: _keyHash, ...key }) => key) });
}

export async function POST(request: Request) {
  const workspace = await getCurrentWorkspace();
  const body = await request.json().catch(() => ({}));
  const created = await createApiKey(workspace.organization.id, String(body.name ?? "API key"));
  await getAnalyticsProvider().track("api_key_created", {
    organizationId: workspace.organization.id
  });

  return NextResponse.json({
    api_key: {
      id: created.record.id,
      name: created.record.name,
      key_prefix: created.record.keyPrefix,
      created_at: created.record.createdAt
    },
    raw_key: created.rawKey
  });
}
