import { isSupabaseServiceConfigured } from "@/lib/supabase/env";
import type {
  ApiKeyCreated,
  ApiKeyRecord,
  AuthenticatedApiKey,
  AIUsageEventInput,
  ClassificationFilters,
  DashboardMetrics
} from "./domain";
import type {
  ClassificationPipelineResult,
  FeedbackInput,
  FeedbackRecord,
  ProductInput,
  StoredClassification
} from "@/types/classification";
import {
  authenticateMockApiKey,
  createMockApiKey,
  ensureMockPlanAllowance,
  getMockClassification,
  getMockDashboardMetrics,
  findMockDuplicateClassification,
  listMockApiKeys,
  listMockClassifications,
  saveMockClassification,
  saveMockFeedback,
  trackMockAIUsageEvent,
  trackMockUsageEvent
} from "./mock-store";
import {
  authenticateSupabaseApiKey,
  createSupabaseApiKey,
  ensureSupabasePlanAllowance,
  getSupabaseClassification,
  getSupabaseDashboardMetrics,
  findSupabaseDuplicateClassification,
  listSupabaseApiKeys,
  listSupabaseClassifications,
  saveSupabaseClassification,
  saveSupabaseFeedback,
  trackSupabaseUsageEvent,
  trackSupabaseAIUsageEvent
} from "./supabase-repository";

function shouldUseSupabaseRepository() {
  return isSupabaseServiceConfigured();
}

export async function ensurePlanAllowance(organizationId: string) {
  if (shouldUseSupabaseRepository()) {
    return ensureSupabasePlanAllowance(organizationId);
  }

  return ensureMockPlanAllowance(organizationId);
}

export async function saveClassification(
  organizationId: string,
  createdBy: string | undefined,
  input: ProductInput,
  result: ClassificationPipelineResult
): Promise<StoredClassification> {
  if (shouldUseSupabaseRepository()) {
    return saveSupabaseClassification(organizationId, createdBy, input, result);
  }

  return saveMockClassification(organizationId, createdBy, input, result);
}

export async function listClassifications(
  organizationId: string,
  filters: ClassificationFilters = {}
): Promise<StoredClassification[]> {
  if (shouldUseSupabaseRepository()) {
    return listSupabaseClassifications(organizationId, filters);
  }

  return listMockClassifications(organizationId, filters);
}

export async function getClassification(
  classificationId: string,
  organizationId?: string
): Promise<StoredClassification | null> {
  if (shouldUseSupabaseRepository()) {
    return getSupabaseClassification(classificationId, organizationId);
  }

  return getMockClassification(classificationId, organizationId);
}

export async function saveFeedback(
  organizationId: string,
  classificationResultId: string,
  input: FeedbackInput
): Promise<FeedbackRecord> {
  if (shouldUseSupabaseRepository()) {
    return saveSupabaseFeedback(organizationId, classificationResultId, input);
  }

  return saveMockFeedback(organizationId, classificationResultId, input);
}

export async function createApiKey(organizationId: string, name: string): Promise<ApiKeyCreated> {
  if (shouldUseSupabaseRepository()) {
    return createSupabaseApiKey(organizationId, name);
  }

  return createMockApiKey(organizationId, name);
}

export async function listApiKeys(organizationId: string): Promise<ApiKeyRecord[]> {
  if (shouldUseSupabaseRepository()) {
    return listSupabaseApiKeys(organizationId);
  }

  return listMockApiKeys(organizationId);
}

export async function authenticateApiKey(rawKey: string): Promise<AuthenticatedApiKey | null> {
  if (shouldUseSupabaseRepository()) {
    return authenticateSupabaseApiKey(rawKey);
  }

  return authenticateMockApiKey(rawKey);
}

export async function trackUsageEvent(
  organizationId: string,
  eventType: string,
  quantity: number,
  metadata: Record<string, unknown> = {},
  apiKeyId?: string
) {
  if (shouldUseSupabaseRepository()) {
    return trackSupabaseUsageEvent(organizationId, eventType, quantity, metadata, apiKeyId);
  }

  return trackMockUsageEvent(organizationId, eventType, quantity, metadata, apiKeyId);
}

export async function trackAIUsageEvent(input: AIUsageEventInput) {
  if (shouldUseSupabaseRepository()) {
    return trackSupabaseAIUsageEvent(input);
  }

  return trackMockAIUsageEvent(input);
}

export async function findDuplicateClassification(
  organizationId: string,
  input: ProductInput
): Promise<StoredClassification | null> {
  if (shouldUseSupabaseRepository()) {
    return findSupabaseDuplicateClassification(organizationId, input);
  }

  return findMockDuplicateClassification(organizationId, input);
}

export async function getDashboardMetrics(organizationId: string): Promise<DashboardMetrics> {
  if (shouldUseSupabaseRepository()) {
    return getSupabaseDashboardMetrics(organizationId);
  }

  return getMockDashboardMetrics(organizationId);
}
