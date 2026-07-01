export const highRiskTerms = [
  "food",
  "cosmetic",
  "chemical",
  "battery",
  "lithium",
  "radio",
  "wireless",
  "medical",
  "pharmaceutical",
  "dual-use",
  "weapon",
  "alcohol",
  "tobacco",
  "animal",
  "plant",
  "supplement",
  "hazardous",
  "controlled"
];

export function includesHighRiskTerms(text: string) {
  const normalized = text.toLowerCase();
  return highRiskTerms.some((term) => normalized.includes(term));
}

export function confidenceLabel(confidence: number): "low" | "medium" | "high" {
  if (confidence >= 0.82) {
    return "high";
  }

  if (confidence >= 0.62) {
    return "medium";
  }

  return "low";
}
