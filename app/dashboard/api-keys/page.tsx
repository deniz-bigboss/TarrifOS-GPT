import { AppShell } from "@/components/layout/app-shell";
import { ApiKeyManager } from "@/components/dashboard/api-key-manager";
import { getCurrentWorkspace } from "@/lib/auth/session";
import { listApiKeys } from "@/lib/db/repository";
import { getDemoRawApiKey } from "@/lib/db/mock-store";

export default async function ApiKeysPage() {
  const workspace = await getCurrentWorkspace();
  const keys = await listApiKeys(workspace.organization.id);

  return (
    <AppShell workspace={workspace}>
      <div className="mb-6">
        <p className="text-sm font-medium text-blue-700">API product</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">API keys</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Use bearer keys for POST /api/v1/classify, classification lookup, and feedback labels.
        </p>
      </div>
      <ApiKeyManager
        initialKeys={keys.map(({ keyHash: _keyHash, ...key }) => key)}
        demoKey={workspace.isMock ? getDemoRawApiKey() : undefined}
      />
      <div className="mt-6 rounded-lg border border-border bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-950">Sample request</p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-xs leading-6 text-slate-100">
{`curl -X POST http://localhost:3000/api/v1/classify \\
  -H "Authorization: Bearer tariffos_test_key_demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "product_name": "Men'\''s cotton t-shirt",
    "product_description": "100% cotton knitted short-sleeve t-shirt",
    "material_composition": "100% cotton",
    "intended_use": "apparel",
    "origin_country": "TR",
    "destination_country": "DE",
    "declared_value": 1200,
    "currency": "EUR"
  }'`}
        </pre>
      </div>
    </AppShell>
  );
}
