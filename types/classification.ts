import type { TariffCandidate } from "./tariff";

export const LEGAL_DISCLAIMER =
  "This output is a recommendation generated from available product information and tariff data. It is not legal advice. Final classification, duty treatment, and customs declarations should be confirmed by a qualified customs broker or customs authority.";

export type ImportOrExport = "import" | "export";

export type UploadedDocumentInput = {
  fileName: string;
  fileType: string;
  fileSizeBytes?: number;
  storagePath?: string;
  extractedText?: string;
};

export type ProductInput = {
  productName: string;
  productDescription: string;
  materialComposition?: string;
  intendedUse?: string;
  brand?: string;
  model?: string;
  sku?: string;
  category?: string;
  supplierCountry?: string;
  originCountry: string;
  destinationCountry: string;
  importOrExport?: ImportOrExport;
  declaredValue?: number;
  currency?: string;
  quantity?: number;
  unitWeight?: number;
  shippingMethod?: string;
  documents?: UploadedDocumentInput[];
};

export type NormalizedProductInput = ProductInput & {
  searchText: string;
  normalizedDescription: string;
};

export type AlternativeCode = {
  code: string;
  title: string;
  reason: string;
  confidence: number;
};

export type AgentPriority = "critical" | "high" | "medium" | "low";

export type ShippingAgentAction = {
  title: string;
  priority: AgentPriority;
  owner: string;
  timeline: string;
  reason: string;
  businessImpact: string;
};

export type ShippingDocumentStatus = "attached" | "missing" | "recommended";

export type ShippingDocumentChecklistItem = {
  name: string;
  status: ShippingDocumentStatus;
  reason: string;
  owner: string;
};

export type ShippingComplianceCheckpoint = {
  title: string;
  severity: AgentPriority;
  description: string;
  nextStep: string;
};

export type ShippingTimelinePhase = {
  phase: string;
  items: string[];
};

export type ShippingAgentPlan = {
  strategic_summary: string;
  readiness_score: number;
  readiness_label: "blocked" | "needs_work" | "ready_with_review" | "ready";
  next_actions: ShippingAgentAction[];
  cost_reduction_actions: ShippingAgentAction[];
  document_checklist: ShippingDocumentChecklistItem[];
  compliance_checkpoints: ShippingComplianceCheckpoint[];
  shipment_timeline: ShippingTimelinePhase[];
  agent_questions: string[];
};

export type ClassificationAIResult = {
  recommended_code: string;
  recommended_title: string;
  confidence: number;
  confidence_label: "low" | "medium" | "high";
  alternative_codes: AlternativeCode[];
  reasoning_summary: string;
  key_factors: string[];
  missing_information: string[];
  required_documents: string[];
  restriction_warnings: string[];
  human_review_required: boolean;
  human_review_reason: string;
  broker_ready_explanation: string;
  disclaimer: string;
  agent_plan?: ShippingAgentPlan;
};

export type ClassificationPipelineResult = ClassificationAIResult & {
  candidates: TariffCandidate[];
  duty_rate_placeholder: string;
};

export type ClassificationRequestRecord = ProductInput & {
  id: string;
  organizationId: string;
  createdBy?: string;
  status: "completed" | "draft" | "failed";
  createdAt: string;
};

export type ClassificationResultRecord = ClassificationPipelineResult & {
  id: string;
  requestId: string;
  organizationId: string;
  raw_ai_output: ClassificationAIResult;
  createdAt: string;
};

export type StoredClassification = {
  request: ClassificationRequestRecord;
  result: ClassificationResultRecord;
};

export type FeedbackInput = {
  actualCode?: string;
  wasCorrect?: boolean;
  brokerNotes?: string;
  shipmentCleared?: boolean;
  delayOccurred?: boolean;
  penaltyOccurred?: boolean;
};

export type FeedbackRecord = FeedbackInput & {
  id: string;
  organizationId: string;
  classificationResultId: string;
  createdAt: string;
};
