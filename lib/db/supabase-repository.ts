import { assertDocumentLimits, assertWithinPlanLimit } from "@/lib/billing/limits";
import { apiKeyPrefix, createRawApiKey, hashApiKey } from "@/lib/api-keys/hash";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type {
  ApiKeyCreated,
  ApiKeyRecord,
  AuthenticatedApiKey,
  AIUsageEventInput,
  ClassificationFilters,
  DashboardMetrics,
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
import type { TariffCandidate } from "@/types/tariff";

type SupabaseUserLike = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

function clientOrThrow() {
  const client = createSupabaseServiceClient();

  if (!client) {
    throw new Error("Supabase service client is not configured.");
  }

  return client;
}

function toOrganization(row: Record<string, any>): OrganizationRecord {
  return {
    id: row.id,
    name: row.name,
    plan: row.plan ?? "free",
    createdAt: row.created_at
  };
}

function mapApiKey(row: Record<string, any>): ApiKeyRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    keyHash: row.key_hash,
    keyPrefix: row.key_prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined
  };
}

function mapRequest(row: Record<string, any>): StoredClassification["request"] {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by ?? undefined,
    productName: row.product_name,
    productDescription: row.product_description,
    materialComposition: row.material_composition ?? undefined,
    intendedUse: row.intended_use ?? undefined,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    sku: row.sku ?? undefined,
    category: row.category ?? undefined,
    supplierCountry: row.supplier_country ?? undefined,
    originCountry: row.origin_country,
    destinationCountry: row.destination_country,
    importOrExport: row.import_or_export ?? "import",
    declaredValue: row.declared_value ?? undefined,
    currency: row.currency ?? undefined,
    quantity: row.quantity ?? undefined,
    unitWeight: row.unit_weight ?? undefined,
    shippingMethod: row.shipping_method ?? undefined,
    status: row.status ?? "completed",
    createdAt: row.created_at
  };
}

function mapCandidate(row: Record<string, any>): TariffCandidate {
  return {
    id: row.id,
    code: row.code,
    jurisdiction: "HS",
    title: row.title,
    description: row.reason ?? "",
    keywords: [],
    chapter: row.code?.split(".")[0] ?? "",
    section: "",
    dutyRatePlaceholder: "",
    requiredDocuments: [],
    restrictionNotes: [],
    riskLevel: "low",
    score: Number(row.confidence ?? 0),
    matchedKeywords: [],
    source: row.source ?? "classification_candidates"
  };
}

function mapStored(row: Record<string, any>): StoredClassification {
  const request = mapRequest(row.classification_requests ?? row.request ?? {});
  const candidates = ((row.classification_candidates ?? []) as Record<string, any>[]).map(mapCandidate);
  const raw = row.raw_ai_output ?? {};

  return {
    request,
    result: {
      id: row.id,
      requestId: row.request_id,
      organizationId: row.organization_id,
      recommended_code: row.recommended_code,
      recommended_title: row.recommended_title,
      confidence: Number(row.confidence ?? 0),
      confidence_label: row.confidence_label ?? "low",
      alternative_codes: raw.alternative_codes ?? [],
      reasoning_summary: row.reasoning_summary ?? "",
      key_factors: row.key_factors ?? [],
      missing_information: row.missing_information ?? [],
      required_documents: row.required_documents ?? [],
      restriction_warnings: row.restriction_warnings ?? [],
      human_review_required: Boolean(row.human_review_required),
      human_review_reason: row.human_review_reason ?? "",
      broker_ready_explanation: row.broker_ready_explanation ?? "",
      disclaimer: raw.disclaimer ?? "",
      candidates,
      duty_rate_placeholder: raw.duty_rate_placeholder ?? "Duty estimate placeholder",
      raw_ai_output: raw,
      createdAt: row.created_at
    }
  };
}

export async function ensureSupabaseWorkspaceForUser(user: SupabaseUserLike): Promise<WorkspaceSession> {
  const client = clientOrThrow();
  const { data: existingProfile, error: profileError } = await client
    .from("profiles")
    .select("*, organizations(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (existingProfile?.organizations) {
    return {
      userId: user.id,
      email: user.email ?? "",
      fullName: existingProfile.full_name ?? user.user_metadata?.full_name ?? "TariffOS User",
      organization: toOrganization(existingProfile.organizations),
      isMock: false
    };
  }

  const nameFromEmail = user.email?.split("@")[0] ?? "Workspace";
  const { data: organization, error: organizationError } = await client
    .from("organizations")
    .insert({ name: `${nameFromEmail}'s workspace`, plan: "free" })
    .select("*")
    .single();

  if (organizationError) {
    throw organizationError;
  }

  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? nameFromEmail;
  const { error: insertProfileError } = await client.from("profiles").insert({
    user_id: user.id,
    organization_id: organization.id,
    full_name: fullName
  });

  if (insertProfileError) {
    throw insertProfileError;
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName,
    organization: toOrganization(organization),
    isMock: false
  };
}

export async function ensureSupabasePlanAllowance(organizationId: string) {
  const client = clientOrThrow();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const { data: organization, error: organizationError } = await client
    .from("organizations")
    .select("plan")
    .eq("id", organizationId)
    .single();

  if (organizationError) throw organizationError;

  const { count, error: countError } = await client
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("event_type", ["ui.classification.created", "api.classification.created"])
    .gte("created_at", monthStart);

  if (countError) throw countError;
  assertWithinPlanLimit(organization?.plan ?? "free", count ?? 0);
}

export async function saveSupabaseClassification(
  organizationId: string,
  createdBy: string | undefined,
  input: ProductInput,
  result: ClassificationPipelineResult
): Promise<StoredClassification> {
  await ensureSupabasePlanAllowance(organizationId);

  const client = clientOrThrow();
  const { data: organization, error: organizationError } = await client
    .from("organizations")
    .select("plan")
    .eq("id", organizationId)
    .single();

  if (organizationError) throw organizationError;
  assertDocumentLimits(organization?.plan, input.documents);

  const { data: request, error: requestError } = await client
    .from("classification_requests")
    .insert({
      organization_id: organizationId,
      created_by: createdBy === "api" ? null : createdBy,
      product_name: input.productName,
      product_description: input.productDescription,
      material_composition: input.materialComposition,
      intended_use: input.intendedUse,
      brand: input.brand,
      model: input.model,
      sku: input.sku,
      category: input.category,
      supplier_country: input.supplierCountry,
      origin_country: input.originCountry,
      destination_country: input.destinationCountry,
      import_or_export: input.importOrExport ?? "import",
      declared_value: input.declaredValue,
      currency: input.currency,
      quantity: input.quantity,
      unit_weight: input.unitWeight,
      shipping_method: input.shippingMethod,
      status: "completed"
    })
    .select("*")
    .single();

  if (requestError) throw requestError;

  if (input.documents?.length) {
    const { error: documentError } = await client.from("documents").insert(
      input.documents.map((document) => ({
        organization_id: organizationId,
        request_id: request.id,
        file_name: document.fileName,
        file_type: document.fileType,
        file_size_bytes: document.fileSizeBytes,
        storage_path: document.storagePath,
        extracted_text: document.extractedText
      }))
    );

    if (documentError) throw documentError;
  }

  const { candidates: _candidates, duty_rate_placeholder: _dutyRatePlaceholder, ...aiResult } = result;
  const rawAiOutput = {
    ...aiResult,
    duty_rate_placeholder: result.duty_rate_placeholder
  };
  const { data: savedResult, error: resultError } = await client
    .from("classification_results")
    .insert({
      request_id: request.id,
      organization_id: organizationId,
      recommended_code: result.recommended_code,
      recommended_title: result.recommended_title,
      confidence: result.confidence,
      confidence_label: result.confidence_label,
      reasoning_summary: result.reasoning_summary,
      key_factors: result.key_factors,
      missing_information: result.missing_information,
      required_documents: result.required_documents,
      restriction_warnings: result.restriction_warnings,
      human_review_required: result.human_review_required,
      human_review_reason: result.human_review_reason,
      broker_ready_explanation: result.broker_ready_explanation,
      raw_ai_output: rawAiOutput,
      duty_rate_placeholder: result.duty_rate_placeholder
    })
    .select("*")
    .single();

  if (resultError) throw resultError;

  const alternativeConfidenceByCode = new Map(
    result.alternative_codes.map((alternative) => [alternative.code, alternative.confidence])
  );
  const { data: candidates, error: candidatesError } = await client
    .from("classification_candidates")
    .insert(
      result.candidates.map((candidate) => ({
        result_id: savedResult.id,
        code: candidate.code,
        title: candidate.title,
        reason: candidate.description,
        confidence: alternativeConfidenceByCode.get(candidate.code) ?? candidate.score,
        source: candidate.source
      }))
    )
    .select("*");

  if (candidatesError) throw candidatesError;

  return mapStored({
    ...savedResult,
    classification_requests: request,
    classification_candidates: candidates ?? []
  });
}

export async function listSupabaseClassifications(
  organizationId: string,
  filters: ClassificationFilters = {}
): Promise<StoredClassification[]> {
  const client = clientOrThrow();
  let query = client
    .from("classification_results")
    .select("*, classification_requests(*), classification_candidates(*)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters.confidence) query = query.eq("confidence_label", filters.confidence);
  if (typeof filters.humanReviewRequired === "boolean") {
    query = query.eq("human_review_required", filters.humanReviewRequired);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .map(mapStored)
    .filter((classification) => {
      if (filters.destinationCountry && classification.request.destinationCountry !== filters.destinationCountry) {
        return false;
      }
      if (filters.category && classification.request.category !== filters.category) {
        return false;
      }
      return true;
    });
}

export async function getSupabaseClassification(
  classificationId: string,
  organizationId?: string
): Promise<StoredClassification | null> {
  const client = clientOrThrow();
  let query = client
    .from("classification_results")
    .select("*, classification_requests(*), classification_candidates(*)")
    .eq("id", classificationId);

  if (organizationId) query = query.eq("organization_id", organizationId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapStored(data) : null;
}

export async function saveSupabaseFeedback(
  organizationId: string,
  classificationResultId: string,
  input: FeedbackInput
): Promise<FeedbackRecord> {
  const client = clientOrThrow();
  const { data, error } = await client
    .from("feedback_labels")
    .insert({
      organization_id: organizationId,
      classification_result_id: classificationResultId,
      actual_code: input.actualCode,
      was_correct: input.wasCorrect,
      broker_notes: input.brokerNotes,
      shipment_cleared: input.shipmentCleared,
      delay_occurred: input.delayOccurred,
      penalty_occurred: input.penaltyOccurred
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    organizationId: data.organization_id,
    classificationResultId: data.classification_result_id,
    actualCode: data.actual_code ?? undefined,
    wasCorrect: data.was_correct ?? undefined,
    brokerNotes: data.broker_notes ?? undefined,
    shipmentCleared: data.shipment_cleared ?? undefined,
    delayOccurred: data.delay_occurred ?? undefined,
    penaltyOccurred: data.penalty_occurred ?? undefined,
    createdAt: data.created_at
  };
}

export async function createSupabaseApiKey(
  organizationId: string,
  name: string
): Promise<ApiKeyCreated> {
  const client = clientOrThrow();
  const rawKey = createRawApiKey();
  const { data, error } = await client
    .from("api_keys")
    .insert({
      organization_id: organizationId,
      name,
      key_hash: hashApiKey(rawKey),
      key_prefix: apiKeyPrefix(rawKey)
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    record: mapApiKey(data),
    rawKey
  };
}

export async function listSupabaseApiKeys(organizationId: string): Promise<ApiKeyRecord[]> {
  const client = clientOrThrow();
  const { data, error } = await client
    .from("api_keys")
    .select("*")
    .eq("organization_id", organizationId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapApiKey);
}

export async function authenticateSupabaseApiKey(rawKey: string): Promise<AuthenticatedApiKey | null> {
  const client = clientOrThrow();
  const { data, error } = await client
    .from("api_keys")
    .select("*")
    .eq("key_hash", hashApiKey(rawKey))
    .is("revoked_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  await client.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  const { data: organization, error: organizationError } = await client
    .from("organizations")
    .select("plan")
    .eq("id", data.organization_id)
    .single();

  if (organizationError) throw organizationError;

  return {
    organizationId: data.organization_id,
    apiKey: mapApiKey(data),
    organizationPlan: organization?.plan ?? "free"
  };
}

export async function trackSupabaseUsageEvent(
  organizationId: string,
  eventType: string,
  quantity: number,
  metadata: Record<string, unknown> = {},
  apiKeyId?: string
) {
  const client = clientOrThrow();
  await client.from("usage_events").insert({
    organization_id: organizationId,
    api_key_id: apiKeyId,
    event_type: eventType,
    quantity,
    metadata
  });
}

export async function trackSupabaseAIUsageEvent(input: AIUsageEventInput) {
  const client = clientOrThrow();
  await client.from("ai_usage_events").insert({
    organization_id: input.organizationId,
    request_id: input.requestId,
    provider: input.provider,
    model: input.model,
    prompt_tokens: input.promptTokens,
    completion_tokens: input.completionTokens,
    estimated_cost_usd: input.estimatedCostUsd,
    success: input.success,
    error_message: input.errorMessage,
    latency_ms: input.latencyMs
  });
}

function applyNullableFilter(query: any, column: string, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return query.is(column, null);
  }

  return query.eq(column, value);
}

export async function findSupabaseDuplicateClassification(
  organizationId: string,
  input: ProductInput
): Promise<StoredClassification | null> {
  const client = clientOrThrow();
  let query = client
    .from("classification_requests")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("product_name", input.productName)
    .eq("product_description", input.productDescription)
    .eq("origin_country", input.originCountry)
    .eq("destination_country", input.destinationCountry);

  query = applyNullableFilter(query, "material_composition", input.materialComposition);
  query = applyNullableFilter(query, "intended_use", input.intendedUse);
  query = applyNullableFilter(query, "import_or_export", input.importOrExport ?? "import");
  query = applyNullableFilter(query, "declared_value", input.declaredValue);
  query = applyNullableFilter(query, "currency", input.currency);
  query = applyNullableFilter(query, "quantity", input.quantity);
  query = applyNullableFilter(query, "unit_weight", input.unitWeight);
  query = applyNullableFilter(query, "shipping_method", input.shippingMethod);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: result, error: resultError } = await client
    .from("classification_results")
    .select("*, classification_requests(*), classification_candidates(*)")
    .eq("request_id", data.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (resultError) throw resultError;
  return result ? mapStored(result) : null;
}

export async function getSupabaseDashboardMetrics(organizationId: string): Promise<DashboardMetrics> {
  const client = clientOrThrow();
  const classifications = await listSupabaseClassifications(organizationId);
  const { data: usageEvents } = await client
    .from("usage_events")
    .select("*")
    .eq("organization_id", organizationId);

  return {
    totalClassifications: classifications.length,
    highConfidence: classifications.filter((classification) => classification.result.confidence_label === "high").length,
    needsReview: classifications.filter((classification) => classification.result.human_review_required).length,
    apiUsage: ((usageEvents ?? []) as UsageEventRecord[]).reduce(
      (total, event) => total + Number(event.quantity ?? 0),
      0
    ),
    recentClassifications: classifications.slice(0, 5)
  };
}
