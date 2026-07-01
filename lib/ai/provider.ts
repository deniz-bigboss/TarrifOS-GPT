import type { ClassificationAIResult, NormalizedProductInput } from "@/types/classification";
import type { TariffCandidate } from "@/types/tariff";

export type AIProvider = {
  providerName: "mock" | "openai" | "anthropic";
  modelName: string;
  classifyProduct(
    input: NormalizedProductInput,
    candidates: TariffCandidate[]
  ): Promise<ClassificationAIResult>;
  generateMissingInfoQuestions(input: NormalizedProductInput): Promise<string[]>;
  generateBrokerReport(
    input: NormalizedProductInput,
    result: ClassificationAIResult,
    candidates: TariffCandidate[]
  ): Promise<string>;
};
