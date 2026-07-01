import { confidenceLabel, includesHighRiskTerms } from "@/lib/compliance";
import type { ClassificationAIResult, NormalizedProductInput } from "@/types/classification";
import { LEGAL_DISCLAIMER } from "@/types/classification";
import type { TariffCandidate } from "@/types/tariff";
import type { AIProvider } from "./provider";

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function clampConfidence(value: number) {
  return Math.max(0.25, Math.min(0.96, Number(value.toFixed(2))));
}

function inferMissingInfo(input: NormalizedProductInput, recommended?: TariffCandidate) {
  const questions: string[] = [];
  const text = input.searchText.toLowerCase();

  if (!input.materialComposition) {
    questions.push("What is the exact material composition by percentage?");
  }

  if (!input.intendedUse) {
    questions.push("What is the product's intended end use and buyer/user?");
  }

  if (!input.unitWeight) {
    questions.push("What is the unit weight and packaging configuration?");
  }

  if (text.includes("battery") || text.includes("lithium") || recommended?.code.startsWith("8507")) {
    questions.push("What are the battery chemistry, watt-hours, voltage, capacity, and UN38.3 status?");
    questions.push("Is the battery shipped alone, packed with equipment, or contained in equipment?");
  }

  if (text.includes("cosmetic") || recommended?.chapter === "33") {
    questions.push("Can you provide the full ingredient list and product safety/labeling documentation?");
  }

  if (text.includes("food") || ["09", "19", "21"].includes(recommended?.chapter ?? "")) {
    questions.push("What are the ingredients, shelf-stable status, and any sanitary certificates available?");
  }

  if (text.includes("medical") || ["30", "90"].includes(recommended?.chapter ?? "")) {
    questions.push("Does the supplier make any medical, therapeutic, diagnostic, or sterile-use claims?");
  }

  return unique(questions).slice(0, 6);
}

function summarizeFactor(input: NormalizedProductInput, candidate: TariffCandidate) {
  const factors = [
    input.materialComposition ? `material: ${input.materialComposition}` : "material needs confirmation",
    input.intendedUse ? `use: ${input.intendedUse}` : "intended use needs confirmation",
    `function/category: ${candidate.title}`,
    `origin: ${input.originCountry}`,
    `destination: ${input.destinationCountry}`
  ];

  return factors;
}

export class MockAIProvider implements AIProvider {
  providerName = "mock" as const;
  modelName = "mock-rules-engine";

  async generateMissingInfoQuestions(input: NormalizedProductInput): Promise<string[]> {
    return inferMissingInfo(input);
  }

  async generateBrokerReport(
    input: NormalizedProductInput,
    result: ClassificationAIResult,
    candidates: TariffCandidate[]
  ): Promise<string> {
    const recommended = candidates.find((candidate) => candidate.code === result.recommended_code) ?? candidates[0];
    const alternativeCodes = result.alternative_codes.map((candidate) => candidate.code).join(", ") || "none";

    return [
      `TariffOS recommends ${result.recommended_code} (${result.recommended_title}) as the likely classification candidate for ${input.productName}.`,
      recommended
        ? `The seed tariff description considered was: "${recommended.description}"`
        : "The recommendation is based on the submitted product details and available seed tariff data.",
      `Key factors reviewed: ${result.key_factors.join("; ")}.`,
      `Alternative candidates reviewed: ${alternativeCodes}.`,
      `Required documents likely include: ${result.required_documents.join(", ")}.`,
      result.restriction_warnings.length
        ? `Restrictions or warnings: ${result.restriction_warnings.join(" ")}`
        : "No restricted-goods warning was found in the seed data, but official review is still required.",
      result.human_review_required
        ? `Human review is required because ${result.human_review_reason}.`
        : "Human review is not automatically required by the current seed rules, but broker confirmation is recommended.",
      LEGAL_DISCLAIMER
    ].join("\n\n");
  }

  async classifyProduct(
    input: NormalizedProductInput,
    candidates: TariffCandidate[]
  ): Promise<ClassificationAIResult> {
    const recommended = candidates[0];
    const alternativeCandidates = candidates.slice(1, 5);
    const hasHighRisk = includesHighRiskTerms(input.searchText) || recommended?.riskLevel === "high";
    const isVague = input.productDescription.trim().split(/\s+/).length < 5 || !input.materialComposition || !input.intendedUse;
    const baseConfidence = recommended
      ? recommended.score >= 18
        ? 0.88
        : recommended.score >= 10
          ? 0.8
          : recommended.score >= 5
            ? 0.68
            : 0.54
      : 0.42;
    const confidence = clampConfidence(baseConfidence - (isVague ? 0.07 : 0) - (hasHighRisk ? 0.03 : 0));
    const missingInformation = inferMissingInfo(input, recommended);
    const humanReviewRequired = confidence < 0.75 || hasHighRisk;
    const docs = unique([
      "commercial invoice",
      "packing list",
      ...(input.originCountry && input.destinationCountry ? ["certificate of origin"] : []),
      ...(recommended?.requiredDocuments ?? [])
    ]);
    const warnings = unique([
      ...(recommended?.restrictionNotes ?? []),
      ...(hasHighRisk ? ["This category is compliance-sensitive and should be reviewed by a qualified customs professional."] : [])
    ]);
    const keyFactors = recommended ? summarizeFactor(input, recommended) : ["product details", "origin", "destination"];

    const result: ClassificationAIResult = {
      recommended_code: recommended?.code ?? "UNDETERMINED",
      recommended_title: recommended?.title ?? "No confident seed-data candidate",
      confidence,
      confidence_label: confidenceLabel(confidence),
      alternative_codes: alternativeCandidates.map((candidate, index) => ({
        code: candidate.code,
        title: candidate.title,
        reason: `Candidate ${candidate.code} matched ${candidate.matchedKeywords.join(", ") || "general product language"} in the seed tariff data.`,
        confidence: clampConfidence(Math.max(0.32, confidence - (index + 1) * 0.08))
      })),
      reasoning_summary: recommended
        ? `The recommendation is based on matching the submitted product details to seed tariff candidate ${recommended.code}: ${recommended.description}`
        : "The seed data did not return a strong candidate. More product detail and human broker review are required.",
      key_factors: keyFactors,
      missing_information: missingInformation,
      required_documents: docs,
      restriction_warnings: warnings,
      human_review_required: humanReviewRequired,
      human_review_reason: humanReviewRequired
        ? hasHighRisk
          ? "the product falls into a high-risk or regulated category"
          : "the confidence score is below 0.75"
        : "",
      broker_ready_explanation: "",
      disclaimer: LEGAL_DISCLAIMER
    };

    return {
      ...result,
      broker_ready_explanation: await this.generateBrokerReport(input, result, candidates)
    };
  }
}
