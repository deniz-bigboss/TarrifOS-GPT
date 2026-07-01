import { getAIProvider } from "@/lib/ai";
import { confidenceLabel, includesHighRiskTerms } from "@/lib/compliance";
import { trackAIUsageEvent } from "@/lib/db/repository";
import { getCandidateSearchProvider } from "@/lib/search/provider";
import { generateShippingAgentPlan } from "@/lib/shipping-agent/plan";
import { getTariffDataProvider } from "@/lib/tariff-data/provider";
import type { ClassificationAIResult, ClassificationPipelineResult, NormalizedProductInput } from "@/types/classification";
import { LEGAL_DISCLAIMER } from "@/types/classification";
import type { TariffCandidate } from "@/types/tariff";
import { normalizeProductInput } from "./normalize";

export type ClassificationRunContext = {
  organizationId?: string;
  requestId?: string;
};

function estimateTokens(value: unknown) {
  return Math.ceil(JSON.stringify(value).length / 4);
}

function estimateCostUsd(provider: string, promptTokens: number, completionTokens: number) {
  if (provider === "mock") return 0;
  return Number(((promptTokens + completionTokens) * 0.000001).toFixed(6));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function clampConfidence(value: number) {
  return Math.max(0.25, Math.min(0.96, Number(value.toFixed(2))));
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function getUnitValue(input: NormalizedProductInput) {
  if (!input.declaredValue || !input.quantity || input.quantity <= 0) {
    return null;
  }

  return input.declaredValue / input.quantity;
}

function evaluateCommercialPlausibility(input: NormalizedProductInput, recommended?: TariffCandidate) {
  const warnings: string[] = [];
  const missingInformation: string[] = [];
  const reviewReasons: string[] = [];
  const keyFactors: string[] = [];
  let confidencePenalty = 0;

  const chapter = recommended?.chapter ?? recommended?.code.slice(0, 2) ?? "";
  const text = input.searchText.toLowerCase();
  const isTShirt =
    recommended?.code.startsWith("6109") ||
    /\bt-?shirt\b/.test(text) ||
    text.includes("singlet") ||
    text.includes("vest");
  const isApparel = isTShirt || ["61", "62"].includes(chapter) || /\b(apparel|garment|clothing|shirt|trouser|dress|jean)\b/.test(text);
  const unitValue = getUnitValue(input);
  const currency = input.currency ?? "EUR";

  if (typeof unitValue === "number") {
    keyFactors.push(`declared unit value: ${formatNumber(unitValue)} ${currency}`);

    if (unitValue <= 0) {
      confidencePenalty += 0.1;
      warnings.push("Declared value per unit is zero or negative; confirm the invoice value before filing.");
      missingInformation.push("Confirm the invoice total, quantity, and declared value basis.");
    } else if (isTShirt && unitValue > 500) {
      confidencePenalty += 0.16;
      warnings.push(`Declared unit value ${formatNumber(unitValue)} ${currency} is very high for a t-shirt; verify whether the value is per unit, per carton, or total invoice value.`);
      missingInformation.push("Confirm whether declared value is total invoice value or per-unit value.");
    } else if (isTShirt && unitValue > 100) {
      confidencePenalty += 0.07;
      warnings.push(`Declared unit value ${formatNumber(unitValue)} ${currency} is high for a t-shirt; confirm brand tier and invoice basis.`);
      missingInformation.push("Confirm brand tier and whether declared value is total invoice value or per-unit value.");
    } else if (isApparel && unitValue > 2000) {
      confidencePenalty += 0.14;
      warnings.push(`Declared unit value ${formatNumber(unitValue)} ${currency} is unusually high for apparel; verify invoice basis and product identity.`);
      missingInformation.push("Confirm the invoice value basis and whether the product description omits luxury materials or components.");
    } else if (isApparel && unitValue > 500) {
      confidencePenalty += 0.08;
      warnings.push(`Declared unit value ${formatNumber(unitValue)} ${currency} is high for apparel; verify invoice basis.`);
      missingInformation.push("Confirm whether declared value is total invoice value or per-unit value.");
    } else if (isApparel && unitValue < 1) {
      confidencePenalty += 0.1;
      warnings.push(`Declared unit value ${formatNumber(unitValue)} ${currency} is unusually low for apparel; verify invoice basis and quantity.`);
      missingInformation.push("Confirm quantity and declared value basis.");
    }
  } else if (input.declaredValue && !input.quantity) {
    missingInformation.push("Add quantity so declared value can be checked per unit.");
  }

  if (typeof input.unitWeight === "number") {
    keyFactors.push(`unit weight: ${formatNumber(input.unitWeight)} kg`);

    if (input.unitWeight <= 0) {
      confidencePenalty += 0.08;
      warnings.push("Unit weight is zero; confirm whether weight was omitted or entered at shipment level.");
      missingInformation.push("Confirm unit weight and packaging configuration.");
    } else if (isTShirt && input.unitWeight > 1.5) {
      confidencePenalty += 0.22;
      warnings.push(`Unit weight ${formatNumber(input.unitWeight)} kg is very high for a t-shirt; confirm whether this is carton or shipment weight rather than per-item weight.`);
      missingInformation.push("Confirm whether unit weight is per item, per carton, or shipment total.");
    } else if (isTShirt && input.unitWeight > 0.75) {
      confidencePenalty += 0.14;
      warnings.push(`Unit weight ${formatNumber(input.unitWeight)} kg is high for a t-shirt; verify fabric weight, packaging, and unit basis.`);
      missingInformation.push("Confirm fabric weight and whether unit weight includes packaging.");
    } else if (isTShirt && input.unitWeight < 0.04) {
      confidencePenalty += 0.08;
      warnings.push(`Unit weight ${formatNumber(input.unitWeight)} kg is unusually low for a t-shirt; verify unit basis.`);
      missingInformation.push("Confirm unit weight and packaging configuration.");
    } else if (isApparel && input.unitWeight > 5) {
      confidencePenalty += 0.18;
      warnings.push(`Unit weight ${formatNumber(input.unitWeight)} kg is unusually high for apparel; confirm whether this is carton or shipment weight.`);
      missingInformation.push("Confirm whether unit weight is per item, per carton, or shipment total.");
    } else if (isApparel && input.unitWeight > 2.5) {
      confidencePenalty += 0.1;
      warnings.push(`Unit weight ${formatNumber(input.unitWeight)} kg is high for apparel; verify unit basis.`);
      missingInformation.push("Confirm whether unit weight includes packaging.");
    } else if (isApparel && input.unitWeight < 0.03) {
      confidencePenalty += 0.08;
      warnings.push(`Unit weight ${formatNumber(input.unitWeight)} kg is unusually low for apparel; verify unit basis.`);
      missingInformation.push("Confirm unit weight and packaging configuration.");
    }
  }

  if (input.declaredValue && !unitValue && input.declaredValue > 100000) {
    confidencePenalty += 0.08;
    warnings.push(`Declared value ${formatNumber(input.declaredValue)} ${currency} is high; provide quantity to support a per-unit plausibility check.`);
  }

  if (warnings.length) {
    reviewReasons.push("commercial value or weight is inconsistent with the product description");
  }

  return {
    confidencePenalty: Math.min(0.3, confidencePenalty),
    keyFactors: unique(keyFactors),
    missingInformation: unique(missingInformation),
    reviewReasons: unique(reviewReasons),
    warnings: unique(warnings)
  };
}

export async function retrieveCandidateCodes(input: NormalizedProductInput): Promise<TariffCandidate[]> {
  return getCandidateSearchProvider().retrieveCandidateCodes(input);
}

export async function generateClassificationReasoning(
  input: NormalizedProductInput,
  candidates: TariffCandidate[],
  context: ClassificationRunContext = {}
): Promise<ClassificationAIResult> {
  const aiProvider = getAIProvider();
  const startedAt = Date.now();
  const promptTokens = estimateTokens({ input, candidates });

  try {
    const result = await aiProvider.classifyProduct(input, candidates);
    const completionTokens = estimateTokens(result);

    if (context.organizationId) {
      await trackAIUsageEvent({
        organizationId: context.organizationId,
        requestId: context.requestId,
        provider: aiProvider.providerName,
        model: aiProvider.modelName,
        promptTokens,
        completionTokens,
        estimatedCostUsd: estimateCostUsd(aiProvider.providerName, promptTokens, completionTokens),
        success: true,
        latencyMs: Date.now() - startedAt
      });
    }

    return result;
  } catch (error) {
    if (context.organizationId) {
      await trackAIUsageEvent({
        organizationId: context.organizationId,
        requestId: context.requestId,
        provider: aiProvider.providerName,
        model: aiProvider.modelName,
        promptTokens,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown AI error",
        latencyMs: Date.now() - startedAt
      });
    }

    throw error;
  }
}

export function calculateConfidence(result: ClassificationAIResult, candidates: TariffCandidate[]) {
  const topScore = candidates[0]?.score ?? 0;
  const bounded = Math.max(0.25, Math.min(0.96, result.confidence));
  const adjusted = topScore < 4 ? Math.min(bounded, 0.62) : bounded;

  return {
    confidence: Number(adjusted.toFixed(2)),
    confidenceLabel: confidenceLabel(adjusted)
  };
}

export function validateClassification(
  input: NormalizedProductInput,
  result: ClassificationAIResult,
  candidates: TariffCandidate[]
): ClassificationAIResult {
  const baseConfidence = calculateConfidence(result, candidates);
  const recommended = candidates.find((candidate) => candidate.code === result.recommended_code) ?? candidates[0];
  const highRisk = includesHighRiskTerms(input.searchText) || recommended?.riskLevel === "high";
  const commercialPlausibility = evaluateCommercialPlausibility(input, recommended);
  const adjustedConfidence = clampConfidence(baseConfidence.confidence - commercialPlausibility.confidencePenalty);
  const reviewReasons = unique([
    result.human_review_required ? result.human_review_reason : "",
    highRisk ? "the product appears to involve a regulated or high-risk category" : "",
    adjustedConfidence < 0.75 ? "the confidence score is below 0.75" : "",
    ...commercialPlausibility.reviewReasons
  ]);
  const humanReviewRequired = result.human_review_required || adjustedConfidence < 0.75 || highRisk || commercialPlausibility.reviewReasons.length > 0;
  const humanReviewReason = humanReviewRequired ? reviewReasons.join("; ") : "";
  const requiredDocs = Array.from(
    new Set(["commercial invoice", "packing list", ...(result.required_documents ?? []), ...(recommended?.requiredDocuments ?? [])])
  );
  const warnings = unique([...(result.restriction_warnings ?? []), ...(recommended?.restrictionNotes ?? []), ...commercialPlausibility.warnings]);

  if (highRisk && !warnings.some((warning) => warning.toLowerCase().includes("review"))) {
    warnings.push("This product category requires human customs/compliance review before filing.");
  }

  const reasoningSummary = commercialPlausibility.warnings.length
    ? `${result.reasoning_summary} Commercial plausibility checks lowered confidence because ${commercialPlausibility.warnings.join(" ")}`
    : result.reasoning_summary;
  const brokerReadyExplanation =
    commercialPlausibility.warnings.length && result.broker_ready_explanation.trim()
      ? `${result.broker_ready_explanation}\n\nCommercial plausibility check: ${commercialPlausibility.warnings.join(" ")}`
      : result.broker_ready_explanation;
  const alternativeCodes = result.alternative_codes.map((candidate) => ({
    ...candidate,
    confidence: clampConfidence(candidate.confidence - commercialPlausibility.confidencePenalty)
  }));

  return {
    ...result,
    confidence: adjustedConfidence,
    confidence_label: confidenceLabel(adjustedConfidence),
    alternative_codes: alternativeCodes,
    reasoning_summary: reasoningSummary,
    key_factors: unique([...(result.key_factors ?? []), ...commercialPlausibility.keyFactors]),
    missing_information: unique([...(result.missing_information ?? []), ...commercialPlausibility.missingInformation]),
    required_documents: requiredDocs,
    restriction_warnings: warnings,
    human_review_required: humanReviewRequired,
    human_review_reason: humanReviewReason,
    broker_ready_explanation: brokerReadyExplanation,
    disclaimer: LEGAL_DISCLAIMER
  };
}

export async function generateBrokerReadyReport(
  input: NormalizedProductInput,
  result: ClassificationAIResult,
  candidates: TariffCandidate[]
) {
  if (result.broker_ready_explanation.trim()) {
    return result.broker_ready_explanation;
  }

  const aiProvider = getAIProvider();
  return aiProvider.generateBrokerReport(input, result, candidates);
}

export async function runClassificationPipeline(payload: unknown, context: ClassificationRunContext = {}): Promise<{
  normalizedInput: NormalizedProductInput;
  result: ClassificationPipelineResult;
}> {
  const normalizedInput = normalizeProductInput(payload);
  const tariffProvider = getTariffDataProvider();
  const candidates = await retrieveCandidateCodes(normalizedInput);
  const rawReasoning = await generateClassificationReasoning(normalizedInput, candidates, context);
  const validated = validateClassification(normalizedInput, rawReasoning, candidates);
  const brokerReport = await generateBrokerReadyReport(normalizedInput, validated, candidates);
  const duty = await tariffProvider.getDutyMeasures(
    validated.recommended_code,
    normalizedInput.originCountry,
    normalizedInput.destinationCountry
  );
  const resultWithBrokerReport = {
    ...validated,
    broker_ready_explanation: brokerReport
  };
  const agentPlan = generateShippingAgentPlan({
    input: normalizedInput,
    result: resultWithBrokerReport,
    candidates,
    dutyRatePlaceholder: duty.dutyRatePlaceholder
  });

  return {
    normalizedInput,
    result: {
      ...resultWithBrokerReport,
      agent_plan: agentPlan,
      candidates,
      duty_rate_placeholder: duty.dutyRatePlaceholder
    }
  };
}
