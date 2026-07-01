import { assertDocumentLimits, assertWithinPlanLimit } from "@/lib/billing/limits";
import { apiKeyPrefix, createRawApiKey, hashApiKey } from "@/lib/api-keys/hash";
import { randomUUID } from "crypto";
import type {
  ApiKeyCreated,
  ApiKeyRecord,
  AuthenticatedApiKey,
  ClassificationFilters,
  DashboardMetrics,
  AIUsageEventInput,
  AIUsageEventRecord,
  OrganizationRecord,
  UsageEventRecord,
  WorkspaceSession
} from "./domain";
import type {
  ClassificationPipelineResult,
  FeedbackInput,
  FeedbackRecord,
  ProductInput,
  StoredClassification
} from "@/types/classification";

type MockState = {
  organizations: OrganizationRecord[];
  classifications: StoredClassification[];
  feedback: FeedbackRecord[];
  apiKeys: ApiKeyRecord[];
  usageEvents: UsageEventRecord[];
  aiUsageEvents: AIUsageEventRecord[];
};

const demoRawApiKey = "tariffos_test_key_demo";
const nowIso = () => new Date().toISOString();

function uuid() {
  return randomUUID();
}

function getState(): MockState {
  const globalStore = globalThis as typeof globalThis & { __tariffosMockState?: MockState };

  if (!globalStore.__tariffosMockState) {
    const organization: OrganizationRecord = {
      id: "org_demo",
      name: "Demo Import Workspace",
      plan: "free",
      createdAt: nowIso()
    };

    globalStore.__tariffosMockState = {
      organizations: [organization],
      classifications: [],
      feedback: [],
      apiKeys: [
        {
          id: "api_key_demo",
          organizationId: organization.id,
          name: "Demo API key",
          keyHash: hashApiKey(demoRawApiKey),
          keyPrefix: apiKeyPrefix(demoRawApiKey),
          createdAt: nowIso()
        }
      ],
      usageEvents: [],
      aiUsageEvents: []
    };
  }

  return globalStore.__tariffosMockState;
}

function monthStartIso() {
  const date = new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

function monthlyClassificationCount(organizationId: string) {
  const state = getState();
  const monthStart = monthStartIso();

  return state.usageEvents
    .filter(
      (event) =>
        event.organizationId === organizationId &&
        event.createdAt >= monthStart &&
        (event.eventType === "ui.classification.created" || event.eventType === "api.classification.created")
    )
    .reduce((total, event) => total + event.quantity, 0);
}

export function getDemoRawApiKey() {
  return demoRawApiKey;
}

export async function getMockWorkspace(email = "demo@tariffos.local"): Promise<WorkspaceSession> {
  const state = getState();
  const organization = state.organizations[0];

  return {
    userId: "user_demo",
    email,
    fullName: "Demo User",
    organization,
    isMock: true
  };
}

export async function ensureMockPlanAllowance(organizationId: string) {
  const state = getState();
  const organization = state.organizations.find((record) => record.id === organizationId);
  assertWithinPlanLimit(organization?.plan ?? "free", monthlyClassificationCount(organizationId));
}

export async function saveMockClassification(
  organizationId: string,
  createdBy: string | undefined,
  input: ProductInput,
  result: ClassificationPipelineResult
): Promise<StoredClassification> {
  const state = getState();
  const organization = state.organizations.find((record) => record.id === organizationId);
  await ensureMockPlanAllowance(organizationId);
  assertDocumentLimits(organization?.plan, input.documents);

  const requestId = uuid();
  const resultId = uuid();
  const createdAt = nowIso();
  const stored: StoredClassification = {
    request: {
      ...input,
      id: requestId,
      organizationId,
      createdBy,
      status: "completed",
      createdAt
    },
    result: {
      ...result,
      id: resultId,
      requestId,
      organizationId,
      raw_ai_output: {
        recommended_code: result.recommended_code,
        recommended_title: result.recommended_title,
        confidence: result.confidence,
        confidence_label: result.confidence_label,
        alternative_codes: result.alternative_codes,
        reasoning_summary: result.reasoning_summary,
        key_factors: result.key_factors,
        missing_information: result.missing_information,
        required_documents: result.required_documents,
        restriction_warnings: result.restriction_warnings,
        human_review_required: result.human_review_required,
        human_review_reason: result.human_review_reason,
        broker_ready_explanation: result.broker_ready_explanation,
        disclaimer: result.disclaimer
      },
      createdAt
    }
  };

  state.classifications.unshift(stored);
  return stored;
}

export async function listMockClassifications(
  organizationId: string,
  filters: ClassificationFilters = {}
): Promise<StoredClassification[]> {
  const state = getState();

  return state.classifications.filter((classification) => {
    if (classification.request.organizationId !== organizationId) return false;
    if (filters.destinationCountry && classification.request.destinationCountry !== filters.destinationCountry) return false;
    if (filters.confidence && classification.result.confidence_label !== filters.confidence) return false;
    if (
      typeof filters.humanReviewRequired === "boolean" &&
      classification.result.human_review_required !== filters.humanReviewRequired
    ) {
      return false;
    }
    if (filters.category && classification.request.category !== filters.category) return false;
    return true;
  });
}

export async function getMockClassification(
  classificationId: string,
  organizationId?: string
): Promise<StoredClassification | null> {
  const state = getState();

  return (
    state.classifications.find(
      (classification) =>
        classification.result.id === classificationId &&
        (!organizationId || classification.result.organizationId === organizationId)
    ) ?? null
  );
}

export async function saveMockFeedback(
  organizationId: string,
  classificationResultId: string,
  input: FeedbackInput
): Promise<FeedbackRecord> {
  const state = getState();
  const feedback: FeedbackRecord = {
    ...input,
    id: uuid(),
    organizationId,
    classificationResultId,
    createdAt: nowIso()
  };

  state.feedback.unshift(feedback);
  return feedback;
}

export async function createMockApiKey(
  organizationId: string,
  name: string
): Promise<ApiKeyCreated> {
  const state = getState();
  const rawKey = createRawApiKey();
  const record: ApiKeyRecord = {
    id: uuid(),
    organizationId,
    name,
    keyHash: hashApiKey(rawKey),
    keyPrefix: apiKeyPrefix(rawKey),
    createdAt: nowIso()
  };

  state.apiKeys.unshift(record);
  return { record, rawKey };
}

export async function listMockApiKeys(organizationId: string): Promise<ApiKeyRecord[]> {
  const state = getState();
  return state.apiKeys.filter((key) => key.organizationId === organizationId && !key.revokedAt);
}

export async function authenticateMockApiKey(rawKey: string): Promise<AuthenticatedApiKey | null> {
  const state = getState();
  const hashed = hashApiKey(rawKey);
  const apiKey = state.apiKeys.find((key) => key.keyHash === hashed && !key.revokedAt);

  if (!apiKey) {
    return null;
  }

  apiKey.lastUsedAt = nowIso();
  return {
    organizationId: apiKey.organizationId,
    apiKey,
    organizationPlan: state.organizations.find((organization) => organization.id === apiKey.organizationId)?.plan ?? "free",
    isMockDemo: apiKey.id === "api_key_demo"
  };
}

export async function trackMockUsageEvent(
  organizationId: string,
  eventType: string,
  quantity: number,
  metadata: Record<string, unknown> = {},
  apiKeyId?: string
) {
  const state = getState();
  state.usageEvents.unshift({
    id: uuid(),
    organizationId,
    apiKeyId,
    eventType,
    quantity,
    metadata,
    createdAt: nowIso()
  });
}

export async function trackMockAIUsageEvent(input: AIUsageEventInput) {
  const state = getState();
  state.aiUsageEvents.unshift({
    ...input,
    id: uuid(),
    createdAt: nowIso()
  });
}

function duplicateKey(input: ProductInput) {
  return [
    input.productName,
    input.productDescription,
    input.materialComposition,
    input.intendedUse,
    input.originCountry,
    input.destinationCountry,
    input.importOrExport,
    input.declaredValue,
    input.currency,
    input.quantity,
    input.unitWeight,
    input.shippingMethod
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

export async function findMockDuplicateClassification(
  organizationId: string,
  input: ProductInput
): Promise<StoredClassification | null> {
  const state = getState();
  const normalized = duplicateKey(input);

  return (
    state.classifications.find((classification) => {
      const candidate = duplicateKey(classification.request);

      return classification.request.organizationId === organizationId && candidate === normalized;
    }) ?? null
  );
}

export async function getMockDashboardMetrics(organizationId: string): Promise<DashboardMetrics> {
  const state = getState();
  const classifications = await listMockClassifications(organizationId);
  const usageEvents = state.usageEvents.filter((event) => event.organizationId === organizationId);

  return {
    totalClassifications: classifications.length,
    highConfidence: classifications.filter((classification) => classification.result.confidence_label === "high").length,
    needsReview: classifications.filter((classification) => classification.result.human_review_required).length,
    apiUsage: usageEvents.reduce((total, event) => total + event.quantity, 0),
    recentClassifications: classifications.slice(0, 5)
  };
}
