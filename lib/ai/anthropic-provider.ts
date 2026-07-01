import type { ClassificationAIResult, NormalizedProductInput } from "@/types/classification";
import { LEGAL_DISCLAIMER } from "@/types/classification";
import type { TariffCandidate } from "@/types/tariff";
import { parseJsonObject } from "./json";
import type { AIProvider } from "./provider";

function buildPrompt(input: NormalizedProductInput, candidates: TariffCandidate[]) {
  return `Return strict JSON only for a customs/tariff classification recommendation.

Rules:
- Use only the provided candidates.
- Do not invent duty rates.
- Confidence below 0.75 means human_review_required is true.
- Food, chemicals, cosmetics, batteries, medical, radio/wireless, dual-use, weapons, alcohol, tobacco, animal, or plant goods require human review.
- Disclaimer must equal: "${LEGAL_DISCLAIMER}"

Product:
${JSON.stringify(input, null, 2)}

Candidates:
${JSON.stringify(candidates, null, 2)}`;
}

export class AnthropicProvider implements AIProvider {
  providerName = "anthropic" as const;
  modelName = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";

  async classifyProduct(input: NormalizedProductInput, candidates: TariffCandidate[]) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: this.modelName,
      max_tokens: 1800,
      system: "You produce conservative customs classification recommendations as structured JSON.",
      messages: [{ role: "user", content: buildPrompt(input, candidates) }]
    });
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    return parseJsonObject<ClassificationAIResult>(text);
  }

  async generateMissingInfoQuestions(input: NormalizedProductInput) {
    const result = await this.classifyProduct(input, []);
    return result.missing_information;
  }

  async generateBrokerReport(
    _input: NormalizedProductInput,
    result: ClassificationAIResult
  ) {
    return result.broker_ready_explanation;
  }
}
