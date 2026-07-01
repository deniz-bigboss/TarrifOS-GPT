import type { FeedbackRecord, StoredClassification } from "@/types/classification";

export type OrganizationRecord = {
  id: string;
  name: string;
  plan: string;
  createdAt: string;
};

export type WorkspaceSession = {
  userId: string;
  email: string;
  fullName: string;
  organization: OrganizationRecord;
  isMock: boolean;
};

export type ApiKeyRecord = {
  id: string;
  organizationId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
};

export type ApiKeyCreated = {
  record: ApiKeyRecord;
  rawKey: string;
};

export type UsageEventRecord = {
  id: string;
  organizationId: string;
  apiKeyId?: string;
  eventType: string;
  quantity: number;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AIUsageEventRecord = {
  id: string;
  organizationId: string;
  requestId?: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
  success: boolean;
  errorMessage?: string;
  latencyMs?: number;
  createdAt: string;
};

export type AIUsageEventInput = Omit<AIUsageEventRecord, "id" | "createdAt">;

export type DashboardMetrics = {
  totalClassifications: number;
  highConfidence: number;
  needsReview: number;
  apiUsage: number;
  recentClassifications: StoredClassification[];
};

export type ClassificationFilters = {
  destinationCountry?: string;
  confidence?: string;
  humanReviewRequired?: boolean;
  category?: string;
};

export type AuthenticatedApiKey = {
  organizationId: string;
  apiKey: ApiKeyRecord;
  organizationPlan: string;
  isMockDemo?: boolean;
};

export type FeedbackSaved = {
  feedback: FeedbackRecord;
};
