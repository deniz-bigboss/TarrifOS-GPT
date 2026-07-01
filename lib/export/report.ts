import type { StoredClassification } from "@/types/classification";

export function buildMarkdownReport(classification: StoredClassification) {
  const { request, result } = classification;

  return [
    `# TariffOS Classification Report`,
    ``,
    `## Product`,
    `- Product name: ${request.productName}`,
    `- Description: ${request.productDescription}`,
    `- Material composition: ${request.materialComposition ?? "Not provided"}`,
    `- Intended use: ${request.intendedUse ?? "Not provided"}`,
    `- SKU: ${request.sku ?? "Not provided"}`,
    `- Trade lane: ${request.originCountry} -> ${request.destinationCountry}`,
    `- Declared value: ${request.declaredValue ?? "Not provided"} ${request.currency ?? ""}`,
    ``,
    `## Recommendation`,
    `- Recommended code: ${result.recommended_code}`,
    `- Recommended title: ${result.recommended_title}`,
    `- Confidence: ${Math.round(result.confidence * 100)}% (${result.confidence_label})`,
    `- Human review required: ${result.human_review_required ? "Yes" : "No"}`,
    result.human_review_reason ? `- Human review reason: ${result.human_review_reason}` : "",
    `- Duty/tax estimate: ${result.duty_rate_placeholder}`,
    ``,
    `## Alternative Codes`,
    ...result.alternative_codes.map(
      (alternative) =>
        `- ${alternative.code} - ${alternative.title}: ${alternative.reason} (${Math.round(alternative.confidence * 100)}%)`
    ),
    ``,
    `## Reasoning`,
    result.reasoning_summary,
    ``,
    `## Key Factors`,
    ...result.key_factors.map((factor) => `- ${factor}`),
    ``,
    `## Missing Information`,
    ...(result.missing_information.length ? result.missing_information.map((item) => `- ${item}`) : ["- None flagged"]),
    ``,
    `## Required Documents`,
    ...result.required_documents.map((document) => `- ${document}`),
    ``,
    `## Restrictions and Warnings`,
    ...(result.restriction_warnings.length ? result.restriction_warnings.map((warning) => `- ${warning}`) : ["- None found in seed data"]),
    ``,
    `## Broker-ready Explanation`,
    result.broker_ready_explanation,
    ``,
    `## Disclaimer`,
    result.disclaimer
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildJsonReport(classification: StoredClassification) {
  return JSON.stringify(classification, null, 2);
}
