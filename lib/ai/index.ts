import { AnthropicProvider } from "./anthropic-provider";
import { MockAIProvider } from "./mock-provider";
import { OpenAIProvider } from "./openai-provider";
import type { AIProvider } from "./provider";

export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();

  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("AI_PROVIDER=openai requires OPENAI_API_KEY. Use AI_PROVIDER=mock for free local development.");
    }

    return new OpenAIProvider();
  }

  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("AI_PROVIDER=anthropic requires ANTHROPIC_API_KEY. Use AI_PROVIDER=mock for free local development.");
    }

    return new AnthropicProvider();
  }

  if (provider !== "mock") {
    throw new Error(`Unsupported AI_PROVIDER "${provider}". Use mock, openai, or anthropic.`);
  }

  return new MockAIProvider();
}
