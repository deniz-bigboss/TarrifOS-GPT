import type { StoredClassification } from "@/types/classification";

export function buildMarkdownReport(classification: StoredClassification) {
  const { request, result } = classification;
  const agentPlan = result.agent_plan;

  return [
    `# TariffOS Shipment Agent Report`,
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
    agentPlan ? `## Shipping Operations Agent` : "",
    agentPlan ? `- Readiness: ${agentPlan.readiness_score}% (${agentPlan.readiness_label})` : "",
    agentPlan ? `- Summary: ${agentPlan.strategic_summary}` : "",
    agentPlan ? `` : "",
    agentPlan ? `### Next Actions` : "",
    ...(agentPlan?.next_actions.map(
      (item) =>
        `- [${item.priority}] ${item.title} - Owner: ${item.owner}; Timing: ${item.timeline}; Impact: ${item.businessImpact}`
    ) ?? []),
    agentPlan ? `` : "",
    agentPlan ? `### Cost Reduction Levers` : "",
    ...(agentPlan?.cost_reduction_actions.map(
      (item) =>
        `- [${item.priority}] ${item.title} - Owner: ${item.owner}; Timing: ${item.timeline}; Impact: ${item.businessImpact}`
    ) ?? []),
    agentPlan ? `` : "",
    agentPlan ? `### Agent Document Checklist` : "",
    ...(agentPlan?.document_checklist.map(
      (document) => `- ${document.name}: ${document.status}; Owner: ${document.owner}; ${document.reason}`
    ) ?? []),
    agentPlan ? `` : "",
    agentPlan ? `### Compliance Checkpoints` : "",
    ...(agentPlan?.compliance_checkpoints.map(
      (checkpoint) => `- [${checkpoint.severity}] ${checkpoint.title}: ${checkpoint.nextStep}`
    ) ?? []),
    agentPlan ? `` : "",
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
