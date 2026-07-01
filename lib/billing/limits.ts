export type PlanName = "free" | "starter" | "growth" | "forwarder" | "enterprise";

export type PlanResourceLimits = {
  monthlyClassifications: number;
  maxDocumentsPerClassification: number;
  maxDocumentBytes: number;
  apiAccess: boolean;
  bulkUpload: boolean;
};

export const planLimits: Record<PlanName, PlanResourceLimits> = {
  free: {
    monthlyClassifications: 10,
    maxDocumentsPerClassification: 3,
    maxDocumentBytes: 5 * 1024 * 1024,
    apiAccess: false,
    bulkUpload: false
  },
  starter: {
    monthlyClassifications: 100,
    maxDocumentsPerClassification: 5,
    maxDocumentBytes: 10 * 1024 * 1024,
    apiAccess: false,
    bulkUpload: false
  },
  growth: {
    monthlyClassifications: 1000,
    maxDocumentsPerClassification: 10,
    maxDocumentBytes: 15 * 1024 * 1024,
    apiAccess: true,
    bulkUpload: false
  },
  forwarder: {
    monthlyClassifications: 5000,
    maxDocumentsPerClassification: 25,
    maxDocumentBytes: 25 * 1024 * 1024,
    apiAccess: true,
    bulkUpload: true
  },
  enterprise: {
    monthlyClassifications: Number.POSITIVE_INFINITY,
    maxDocumentsPerClassification: 50,
    maxDocumentBytes: 50 * 1024 * 1024,
    apiAccess: true,
    bulkUpload: true
  }
};

export class PlanLimitError extends Error {
  constructor(
    public plan: string,
    public limit: number
  ) {
    super(`The ${plan} plan allows ${limit} classifications per month.`);
    this.name = "PlanLimitError";
  }
}

export class PlanFeatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanFeatureError";
  }
}

export class DocumentLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentLimitError";
  }
}

export type DocumentLimitInput = {
  fileName: string;
  fileSizeBytes?: number;
};

export function normalizePlanName(plan: string | undefined): PlanName {
  const normalized = (plan || "free").toLowerCase();
  return normalized in planLimits ? (normalized as PlanName) : "free";
}

export function getPlanLimits(plan: string | undefined) {
  return planLimits[normalizePlanName(plan)];
}

export function assertWithinPlanLimit(plan: string, monthlyCount: number) {
  const normalized = normalizePlanName(plan);
  const limit = planLimits[normalized].monthlyClassifications;

  if (monthlyCount >= limit) {
    throw new PlanLimitError(normalized, limit);
  }
}

export function assertApiAccess(plan: string | undefined, allowMockDemo = false) {
  if (allowMockDemo) {
    return;
  }

  const normalized = normalizePlanName(plan);
  const limits = planLimits[normalized];

  if (!limits.apiAccess) {
    throw new PlanFeatureError(`The ${normalized} plan does not include API access. Upgrade to Growth or higher.`);
  }
}

export function assertDocumentLimits(plan: string | undefined, documents: DocumentLimitInput[] = []) {
  const normalized = normalizePlanName(plan);
  const limits = planLimits[normalized];

  if (documents.length > limits.maxDocumentsPerClassification) {
    throw new DocumentLimitError(
      `The ${normalized} plan allows ${limits.maxDocumentsPerClassification} documents per classification.`
    );
  }

  const oversized = documents.find(
    (document) => typeof document.fileSizeBytes === "number" && document.fileSizeBytes > limits.maxDocumentBytes
  );

  if (oversized) {
    throw new DocumentLimitError(
      `${oversized.fileName} exceeds the ${Math.round(limits.maxDocumentBytes / 1024 / 1024)} MB document limit for the ${normalized} plan.`
    );
  }
}
