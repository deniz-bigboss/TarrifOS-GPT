import type {
  ClassificationAIResult,
  NormalizedProductInput,
  ShippingAgentAction,
  ShippingAgentPlan,
  ShippingComplianceCheckpoint,
  ShippingDocumentChecklistItem,
  ShippingDocumentStatus,
  ShippingTimelinePhase
} from "@/types/classification";
import type { TariffCandidate } from "@/types/tariff";

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function getUnitValue(input: NormalizedProductInput) {
  if (!input.declaredValue || !input.quantity || input.quantity <= 0) return null;
  return input.declaredValue / input.quantity;
}

function getTotalWeight(input: NormalizedProductInput) {
  if (!input.unitWeight || !input.quantity || input.quantity <= 0) return null;
  return input.unitWeight * input.quantity;
}

function readinessLabel(score: number, result: ClassificationAIResult): ShippingAgentPlan["readiness_label"] {
  if (score < 50 || result.human_review_required) return score < 55 ? "blocked" : "needs_work";
  if (score < 78) return "ready_with_review";
  return "ready";
}

function priorityFromScore(score: number) {
  if (score < 50) return "critical" as const;
  if (score < 70) return "high" as const;
  if (score < 85) return "medium" as const;
  return "low" as const;
}

function attachedDocumentText(input: NormalizedProductInput) {
  return (input.documents ?? [])
    .map((document) => `${document.fileName} ${document.fileType} ${document.extractedText ?? ""}`.toLowerCase())
    .join(" ");
}

function statusForDocument(name: string, attachedText: string): ShippingDocumentStatus {
  const normalized = name.toLowerCase();
  const aliases = [
    normalized,
    normalized.replace(/certificate of /g, ""),
    normalized.replace(/commercial /g, ""),
    normalized.replace(/material safety data sheet/g, "msds"),
    normalized.replace(/safety data sheet/g, "sds")
  ];

  return aliases.some((alias) => alias && attachedText.includes(alias)) ? "attached" : "missing";
}

function documentReason(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("invoice")) return "Needed to support customs value, seller/buyer identity, quantity, and currency.";
  if (normalized.includes("packing")) return "Needed to reconcile cartons, weights, quantities, and shipment handling details.";
  if (normalized.includes("origin")) return "Needed to support origin claims, duty treatment, and preferential-rate review.";
  if (normalized.includes("safety") || normalized.includes("sds") || normalized.includes("msds")) {
    return "Needed for regulated, chemical, battery, cosmetic, or hazardous-goods review.";
  }
  if (normalized.includes("spec") || normalized.includes("technical")) {
    return "Needed to confirm materials, use, technical properties, and classification factors.";
  }
  return "Needed for broker review and shipment-file completeness.";
}

function buildDocumentChecklist(input: NormalizedProductInput, result: ClassificationAIResult): ShippingDocumentChecklistItem[] {
  const attachedText = attachedDocumentText(input);
  const baseDocuments = ["commercial invoice", "packing list"];
  const extraDocuments = unique([...baseDocuments, ...result.required_documents]);

  return extraDocuments.map((name) => {
    const status = statusForDocument(name, attachedText);
    return {
      name,
      status,
      reason: documentReason(name),
      owner: status === "attached" ? "Operations" : name.toLowerCase().includes("origin") ? "Supplier" : "Importer"
    };
  });
}

function action(
  title: string,
  priority: ShippingAgentAction["priority"],
  owner: string,
  timeline: string,
  reason: string,
  businessImpact: string
): ShippingAgentAction {
  return { title, priority, owner, timeline, reason, businessImpact };
}

function buildNextActions(
  input: NormalizedProductInput,
  result: ClassificationAIResult,
  documents: ShippingDocumentChecklistItem[],
  readiness: number
): ShippingAgentAction[] {
  const missingDocuments = documents.filter((document) => document.status === "missing");
  const actions: ShippingAgentAction[] = [
    action(
      "Confirm the recommended HS code with a broker before filing",
      result.human_review_required ? "critical" : "medium",
      "Trade compliance",
      "Before customs entry",
      result.human_review_required ? result.human_review_reason || "The shipment has review flags." : "The recommendation is strong, but filing still needs accountable human sign-off.",
      "Reduces misclassification, customs delay, and post-entry correction risk."
    ),
    action(
      "Build the customs filing pack from the document checklist",
      missingDocuments.length ? "high" : "low",
      "Operations",
      "Before carrier handoff",
      missingDocuments.length
        ? `${missingDocuments.length} document item${missingDocuments.length === 1 ? " is" : "s are"} still missing.`
        : "Core shipment documents are attached or accounted for.",
      "Prevents broker back-and-forth and improves first-pass clearance readiness."
    )
  ];

  if (result.missing_information.length) {
    actions.push(
      action(
        "Collect unanswered product facts from supplier or product team",
        "high",
        "Product operations",
        "Today",
        result.missing_information.slice(0, 2).join(" "),
        "Improves classification confidence and prevents avoidable manual review."
      )
    );
  }

  if (result.restriction_warnings.length) {
    actions.push(
      action(
        "Run compliance gate for restrictions, labels, permits, and product claims",
        "critical",
        "Compliance",
        "Before booking freight",
        result.restriction_warnings[0],
        "Avoids shipments moving before license, labeling, or controlled-goods questions are resolved."
      )
    );
  }

  if (input.declaredValue && input.quantity) {
    const unitValue = getUnitValue(input);
    actions.push(
      action(
        "Validate invoice value basis against quantity and unit price",
        unitValue && unitValue > 0 ? "medium" : "high",
        "Finance",
        "Before document handoff",
        unitValue
          ? `Declared unit value is ${formatNumber(unitValue)} ${input.currency ?? ""}.`
          : "Declared value cannot be reconciled to a unit value.",
        "Reduces valuation disputes, incorrect duty estimates, and margin surprises."
      )
    );
  }

  actions.push(
    action(
      "Create a broker handoff note from the generated explanation",
      priorityFromScore(readiness),
      "Operations",
      "Before customs filing",
      "Broker-ready explanation is available in the report export.",
      "Cuts manual briefing time and gives brokers a clear audit trail."
    )
  );

  return actions.slice(0, 6);
}

function buildCostActions(input: NormalizedProductInput, result: ClassificationAIResult): ShippingAgentAction[] {
  const actions: ShippingAgentAction[] = [];
  const totalWeight = getTotalWeight(input);
  const unitValue = getUnitValue(input);
  const method = input.shippingMethod?.toLowerCase() ?? "";

  actions.push(
    action(
      "Compare landed-cost scenarios before committing the purchase order",
      "high",
      "Finance",
      "Before PO approval",
      `Use the recommended code ${result.recommended_code}, destination ${input.destinationCountry}, and the current duty placeholder as the calculation basis.`,
      "Makes margin impact visible before the shipment becomes hard to change."
    )
  );

  if (input.originCountry && input.destinationCountry) {
    actions.push(
      action(
        "Check origin documentation for preferential duty opportunities",
        "medium",
        "Supplier",
        "Before invoice finalization",
        `${input.originCountry} -> ${input.destinationCountry} may require origin evidence before any preferential treatment can be considered.`,
        "Can reduce duty exposure when a valid trade program or origin claim applies."
      )
    );
  }

  if (method.includes("air") || method.includes("express")) {
    actions.push(
      action(
        "Quote deferred air, road, or ocean alternatives for non-urgent units",
        "medium",
        "Logistics",
        "Before booking",
        `Current method is ${input.shippingMethod}.`,
        "Reduces freight cost when delivery date allows slower service."
      )
    );
  } else {
    actions.push(
      action(
        "Benchmark carrier quotes and consolidation options",
        "medium",
        "Logistics",
        "Before booking",
        input.shippingMethod ? `Current method is ${input.shippingMethod}.` : "No shipping method was provided.",
        "Improves freight pricing and reduces minimum-charge waste."
      )
    );
  }

  if (totalWeight && totalWeight < 30) {
    actions.push(
      action(
        "Consolidate low-weight shipments where delivery promises allow",
        "low",
        "Logistics",
        "Before pickup",
        `Estimated shipment weight is ${formatNumber(totalWeight)} kg.`,
        "Avoids small-shipment minimums and duplicated customs/broker fees."
      )
    );
  }

  if (unitValue && unitValue > 100) {
    actions.push(
      action(
        "Review insurance, declared value, and packaging protection",
        "medium",
        "Operations",
        "Before handoff",
        `Unit value is ${formatNumber(unitValue)} ${input.currency ?? ""}.`,
        "Protects margin from loss, damage, and avoidable claim disputes."
      )
    );
  }

  return actions.slice(0, 5);
}

function buildComplianceCheckpoints(
  input: NormalizedProductInput,
  result: ClassificationAIResult,
  documents: ShippingDocumentChecklistItem[],
  recommended?: TariffCandidate
): ShippingComplianceCheckpoint[] {
  const missingDocuments = documents.filter((document) => document.status === "missing");
  const checkpoints: ShippingComplianceCheckpoint[] = [
    {
      title: "Classification sign-off",
      severity: result.human_review_required ? "critical" : "medium",
      description: `Recommended code ${result.recommended_code} is the working basis for customs filing.`,
      nextStep: result.human_review_required
        ? "Send the result and product facts to a qualified broker before booking."
        : "Keep the report with shipment records and confirm before filing."
    },
    {
      title: "Valuation and quantity reconciliation",
      severity: input.declaredValue && input.quantity ? "medium" : "high",
      description: "Invoice value, quantity, unit price, and currency should reconcile cleanly.",
      nextStep: input.declaredValue && input.quantity ? "Compare the generated unit-value note with the supplier invoice." : "Add declared value and quantity before finalizing the shipment."
    },
    {
      title: "Document readiness",
      severity: missingDocuments.length ? "high" : "low",
      description: `${missingDocuments.length} checklist item${missingDocuments.length === 1 ? " is" : "s are"} still marked missing.`,
      nextStep: missingDocuments.length
        ? `Collect ${missingDocuments.slice(0, 3).map((document) => document.name).join(", ")}.`
        : "Attach final originals or broker-approved copies to the shipment file."
    }
  ];

  if (result.restriction_warnings.length || recommended?.riskLevel === "high") {
    checkpoints.push({
      title: "Regulated goods review",
      severity: "critical",
      description: result.restriction_warnings[0] ?? "The tariff seed marks this product as compliance-sensitive.",
      nextStep: "Confirm permits, product claims, labeling, safety data, and market-entry obligations before shipment."
    });
  }

  return checkpoints;
}

function buildTimeline(
  input: NormalizedProductInput,
  result: ClassificationAIResult,
  documents: ShippingDocumentChecklistItem[]
): ShippingTimelinePhase[] {
  const missingDocs = documents.filter((document) => document.status === "missing").map((document) => document.name);

  return [
    {
      phase: "Today",
      items: [
        "Lock product facts, material composition, intended use, and commercial value basis.",
        result.human_review_required ? "Send the classification result for broker review." : "Keep broker sign-off as a final pre-filing step."
      ]
    },
    {
      phase: "Before booking freight",
      items: [
        input.shippingMethod ? `Benchmark ${input.shippingMethod} against at least one alternative service.` : "Choose a shipping method based on cost, urgency, and compliance constraints.",
        result.restriction_warnings.length ? "Resolve restriction, license, label, or product-claim questions." : "Confirm no special permit or restricted-goods handling is triggered by the product facts."
      ]
    },
    {
      phase: "Before carrier handoff",
      items: [
        missingDocs.length ? `Collect missing documents: ${missingDocs.slice(0, 4).join(", ")}.` : "Attach final invoice, packing list, and origin evidence to the shipment file.",
        "Share broker-ready explanation and candidate codes with the customs broker."
      ]
    },
    {
      phase: "After clearance",
      items: [
        "Record final broker/authority decision in the feedback loop.",
        "Reuse accepted classification and document pack for repeat shipments."
      ]
    }
  ];
}

export function generateShippingAgentPlan({
  input,
  result,
  candidates,
  dutyRatePlaceholder
}: {
  input: NormalizedProductInput;
  result: ClassificationAIResult;
  candidates: TariffCandidate[];
  dutyRatePlaceholder: string;
}): ShippingAgentPlan {
  const recommended = candidates.find((candidate) => candidate.code === result.recommended_code) ?? candidates[0];
  const documents = buildDocumentChecklist(input, result);
  const missingDocs = documents.filter((document) => document.status === "missing").length;
  const readiness = clampScore(
    100 -
      (result.human_review_required ? 16 : 0) -
      Math.min(24, result.missing_information.length * 6) -
      Math.min(24, missingDocs * 6) -
      Math.min(20, result.restriction_warnings.length * 8) -
      (result.confidence < 0.75 ? 10 : result.confidence < 0.85 ? 4 : 0)
  );
  const nextActions = buildNextActions(input, result, documents, readiness);
  const costActions = buildCostActions(input, result);
  const checkpoints = buildComplianceCheckpoints(input, result, documents, recommended);
  const timeline = buildTimeline(input, result, documents);
  const unitValue = getUnitValue(input);
  const totalWeight = getTotalWeight(input);
  const lane = `${input.originCountry} -> ${input.destinationCountry}`;
  const metrics = unique([
    input.shippingMethod ? `method: ${input.shippingMethod}` : "",
    unitValue ? `unit value: ${formatNumber(unitValue)} ${input.currency ?? ""}` : "",
    totalWeight ? `estimated shipment weight: ${formatNumber(totalWeight)} kg` : "",
    `duty basis: ${dutyRatePlaceholder}`
  ]);

  return {
    strategic_summary: `TariffOS is treating this as a ${lane} shipment plan for ${input.productName}. The agent is using ${result.recommended_code} as the working classification and prioritizing ${nextActions[0]?.title.toLowerCase() ?? "customs readiness"} before shipment movement. ${metrics.join("; ")}.`,
    readiness_score: readiness,
    readiness_label: readinessLabel(readiness, result),
    next_actions: nextActions,
    cost_reduction_actions: costActions,
    document_checklist: documents,
    compliance_checkpoints: checkpoints,
    shipment_timeline: timeline,
    agent_questions: unique(result.missing_information).slice(0, 6)
  };
}
