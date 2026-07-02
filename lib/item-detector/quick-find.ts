export type QuickFindItem = {
  productName: string;
  productDescription: string;
  materialComposition?: string;
  intendedUse?: string;
  brand?: string;
  model?: string;
  category?: string;
  sourceName: string;
  sourceUrl?: string;
  confidence: "ai_search" | "internet" | "inferred";
};

type DuckDuckGoTopic = {
  Text?: string;
  FirstURL?: string;
  Topics?: DuckDuckGoTopic[];
};

type DuckDuckGoResponse = {
  Heading?: string;
  AbstractText?: string;
  AbstractURL?: string;
  RelatedTopics?: DuckDuckGoTopic[];
};

type GeminiCitation = {
  type?: string;
  url?: string;
  title?: string;
};

type GeminiTextBlock = {
  type?: string;
  text?: string;
  annotations?: GeminiCitation[];
};

type GeminiStep = {
  type?: string;
  content?: GeminiTextBlock[];
};

type GeminiInteractionResponse = {
  output_text?: string;
  steps?: GeminiStep[];
};

type GeminiProductPayload = {
  productName?: string;
  productDescription?: string;
  materialComposition?: string;
  intendedUse?: string;
  brand?: string;
  model?: string;
  category?: string;
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function optionalClean(value: unknown) {
  return typeof value === "string" && value.trim() ? clean(value) : undefined;
}

function firstRelatedTopic(topics: DuckDuckGoTopic[] = []): DuckDuckGoTopic | null {
  for (const topic of topics) {
    if (topic.Text) return topic;
    const nested = firstRelatedTopic(topic.Topics ?? []);
    if (nested) return nested;
  }

  return null;
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

function extractJsonObject(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function extractGeminiText(response: GeminiInteractionResponse) {
  if (response.output_text) return response.output_text;

  for (const step of response.steps ?? []) {
    if (step.type !== "model_output") continue;
    const block = step.content?.find((content) => content.type === "text" && content.text);
    if (block?.text) return block.text;
  }

  return "";
}

function extractGeminiCitation(response: GeminiInteractionResponse) {
  for (const step of response.steps ?? []) {
    if (step.type !== "model_output") continue;

    for (const block of step.content ?? []) {
      const citation = block.annotations?.find((annotation) => annotation.type === "url_citation" && annotation.url);
      if (citation?.url) {
        return {
          sourceName: citation.title ? `Gemini Search: ${citation.title}` : "Gemini Search",
          sourceUrl: citation.url
        };
      }
    }
  }

  return {
    sourceName: "Gemini Search"
  };
}

function buildGeminiPrompt(query: string) {
  return [
    `Search the public internet for the commercial product "${query}".`,
    "Return only JSON. Do not wrap the JSON in prose.",
    "The JSON object must have these string fields:",
    "productName, productDescription, materialComposition, intendedUse, brand, model, category.",
    "Write productDescription for customs and shipping operations, not marketing. Include what the product is, what it is used for, key materials/components if available, and what facts still need confirmation for customs.",
    "If a fact is uncertain, say that it needs confirmation instead of inventing exact specifications."
  ].join("\n");
}

async function searchWithGemini(query: string): Promise<QuickFindItem | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      model: getGeminiModel(),
      input: buildGeminiPrompt(query),
      tools: [{ type: "google_search" }]
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as GeminiInteractionResponse;
  const text = extractGeminiText(payload);
  if (!text) return null;

  const parsed = JSON.parse(extractJsonObject(text)) as GeminiProductPayload;
  const description = optionalClean(parsed.productDescription);
  if (!description) return null;

  const category = optionalClean(parsed.category) ?? inferCategory(query, description);
  const citation = extractGeminiCitation(payload);

  return {
    productName: optionalClean(parsed.productName) ?? query,
    productDescription: buildDescription(query, description, category),
    materialComposition: optionalClean(parsed.materialComposition) ?? inferMaterial(query, description),
    intendedUse: optionalClean(parsed.intendedUse) ?? inferUse(category),
    brand: optionalClean(parsed.brand) ?? inferBrand(query),
    model: optionalClean(parsed.model) ?? query,
    category,
    sourceName: citation.sourceName,
    sourceUrl: citation.sourceUrl,
    confidence: "ai_search"
  };
}

function inferBrand(query: string) {
  const normalized = query.toLowerCase();

  if (normalized.includes("s-works") || normalized.includes("tarmac")) return "Specialized";
  if (normalized.includes("iphone")) return "Apple";
  if (normalized.includes("galaxy")) return "Samsung";
  if (normalized.includes("thinkpad")) return "Lenovo";
  if (normalized.includes("macbook")) return "Apple";
  if (normalized.includes("air jordan")) return "Nike";

  return query.split(/\s+/).slice(0, 2).join(" ");
}

function inferCategory(query: string, summary: string) {
  const text = `${query} ${summary}`.toLowerCase();

  if (/\b(bike|bicycle|frameset|tarmac|road cycling)\b/.test(text)) return "bicycle";
  if (/\b(t-?shirt|shirt|hoodie|jacket|apparel|garment)\b/.test(text)) return "apparel";
  if (/\b(shoe|sneaker|boot|trainer)\b/.test(text)) return "footwear";
  if (/\b(phone|smartphone|iphone|galaxy)\b/.test(text)) return "consumer electronics";
  if (/\b(laptop|notebook|macbook|thinkpad)\b/.test(text)) return "computer";
  if (/\b(battery|lithium|power bank)\b/.test(text)) return "battery";
  if (/\b(cosmetic|cream|serum|lotion|makeup)\b/.test(text)) return "cosmetics";
  if (/\b(food|snack|coffee|tea|chocolate)\b/.test(text)) return "food";
  if (/\b(medical|diagnostic|surgical|sterile)\b/.test(text)) return "medical";

  return "consumer product";
}

function inferMaterial(query: string, summary: string) {
  const text = `${query} ${summary}`.toLowerCase();

  if (/\b(carbon|carbon fiber|carbon fibre)\b/.test(text)) return "carbon fiber composite; confirm exact bill of materials";
  if (/\b(cotton)\b/.test(text)) return "cotton; confirm percentage composition";
  if (/\b(leather)\b/.test(text)) return "leather; confirm genuine/synthetic composition";
  if (/\b(lithium|battery)\b/.test(text)) return "lithium battery chemistry; confirm Wh rating and UN38.3 status";
  if (/\b(aluminum|aluminium)\b/.test(text)) return "aluminum; confirm alloy and component breakdown";
  if (/\b(plastic|polycarbonate|abs)\b/.test(text)) return "plastic/polymer materials; confirm exact resin";

  return "material composition needs confirmation";
}

function inferUse(category: string) {
  if (category === "bicycle") return "road cycling, racing, or high-performance recreational use";
  if (category === "apparel") return "wearable apparel for retail sale";
  if (category === "footwear") return "footwear for retail sale";
  if (category === "consumer electronics") return "consumer electronic device use";
  if (category === "computer") return "portable computing use";
  if (category === "battery") return "portable power or equipment power source";
  if (category === "cosmetics") return "personal care or cosmetic use";
  if (category === "food") return "human consumption";
  if (category === "medical") return "medical, diagnostic, or clinical use; confirm claims";

  return "commercial/consumer use; confirm intended use";
}

function buildDescription(query: string, summary: string, category: string) {
  const base = summary
    ? clean(summary)
    : `${query} appears to be a ${category}. Confirm exact model, materials, accessories, and whether it is shipped complete or as parts.`;

  return `${base} Customs data to confirm: exact model/configuration, material composition, function, included accessories, quantity, country of origin, and whether the shipment contains batteries, liquids, regulated claims, or spare parts.`;
}

async function searchDuckDuckGo(query: string): Promise<{
  summary: string;
  sourceName: string;
  sourceUrl?: string;
} | null> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store",
    signal: AbortSignal.timeout(6000)
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as DuckDuckGoResponse;
  const related = firstRelatedTopic(payload.RelatedTopics);
  const summary = clean(payload.AbstractText || related?.Text || "");

  if (!summary) return null;

  return {
    summary,
    sourceName: payload.Heading ? `DuckDuckGo: ${payload.Heading}` : "DuckDuckGo Instant Answer",
    sourceUrl: payload.AbstractURL || related?.FirstURL
  };
}

export async function quickFindItem(query: string): Promise<QuickFindItem> {
  const cleanQuery = clean(query);

  if (cleanQuery.length < 3) {
    throw new Error("Type at least 3 characters to quick-find an item.");
  }

  try {
    const geminiResult = await searchWithGemini(cleanQuery);
    if (geminiResult) return geminiResult;
  } catch {
    // Fall through to lightweight public lookup and deterministic inference.
  }

  let internetResult: Awaited<ReturnType<typeof searchDuckDuckGo>> = null;

  try {
    internetResult = await searchDuckDuckGo(cleanQuery);
  } catch {
    internetResult = null;
  }

  const summary = internetResult?.summary ?? "";
  const category = inferCategory(cleanQuery, summary);
  const brand = inferBrand(cleanQuery);

  return {
    productName: cleanQuery,
    productDescription: buildDescription(cleanQuery, summary, category),
    materialComposition: inferMaterial(cleanQuery, summary),
    intendedUse: inferUse(category),
    brand,
    model: cleanQuery,
    category,
    sourceName: internetResult?.sourceName ?? "TariffOS quick inference",
    sourceUrl: internetResult?.sourceUrl,
    confidence: internetResult ? "internet" : "inferred"
  };
}
