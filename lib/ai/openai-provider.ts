import type { ClassificationAIResult, NormalizedProductInput } from "@/types/classification";
import { LEGAL_DISCLAIMER } from "@/types/classification";
import type { TariffCandidate } from "@/types/tariff";
import { parseJsonObject } from "./json";
import type { AIProvider } from "./provider";

function buildPrompt(input: NormalizedProductInput, candidates: TariffCandidate[]) {
  return `You are TariffOS, a customs classification assistant. Return strict JSON only.

Rules:
- Recommend likely HS/HTS/TARIC-style candidates from the provided candidate data only.
- Do not invent duty rates. Mention duty estimates only as placeholders unless provided.
- Cite candidate descriptions from the provided candidates in reasoning.
- If confidence < 0.75, set human_review_required true.
- If product involves food, chemicals, cosmetics, batteries, medical products, dual-use goods, weapons, alcohol, tobacco, animal products, or plant products, set human_review_required true.
- Use this exact disclaimer: "${LEGAL_DISCLAIMER}"

Expected JSON keys:
recommended_code, recommended_title, confidence, confidence_label, alternative_codes, reasoning_summary, key_factors, missing_information, required_documents, restriction_warnings, human_review_required, human_review_reason, broker_ready_explanation, disclaimer.

Product:
${JSON.stringify(input, null, 2)}

Candidates:
${JSON.stringify(candidates, null, 2)}`;
}

export class OpenAIProvider implements AIProvider {
  providerName = "openai" as const;
  modelName = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  async classifyProduct(input: NormalizedProductInput, candidates: TariffCandidate[]) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: this.modelName,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You produce conservative customs classification recommendations as structured JSON."
        },
        { role: "user", content: buildPrompt(input, candidates) }
      ]
    });

    return parseJsonObject<ClassificationAIResult>(completion.choices[0]?.message.content ?? "{}");
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
