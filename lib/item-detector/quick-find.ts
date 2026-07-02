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

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{
      title?: string;
    }>;
  };
};

type WikipediaSummaryResponse = {
  title?: string;
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
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

type ProductProfile = {
  productName?: string;
  summary?: string;
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

  if (normalized.includes("casio") || normalized.includes("g-shock") || normalized.includes("f-91w")) return "Casio";
  if (normalized.includes("s-works") || normalized.includes("tarmac")) return "Specialized";
  if (normalized.includes("iphone")) return "Apple";
  if (normalized.includes("galaxy")) return "Samsung";
  if (normalized.includes("thinkpad")) return "Lenovo";
  if (normalized.includes("macbook")) return "Apple";
  if (normalized.includes("air jordan")) return "Nike";
  if (normalized.includes("seiko")) return "Seiko";
  if (normalized.includes("rolex")) return "Rolex";
  if (normalized.includes("citizen")) return "Citizen";
  if (normalized.includes("garmin")) return "Garmin";
  if (normalized.includes("sony")) return "Sony";
  if (normalized.includes("canon")) return "Canon";
  if (normalized.includes("nikon")) return "Nikon";
  if (normalized.includes("lego")) return "LEGO";

  return query.split(/\s+/).slice(0, 2).join(" ");
}

function knownProductProfile(query: string, summary = ""): ProductProfile | null {
  const text = `${query} ${summary}`.toLowerCase();

  if (text.includes("casio") && /\bf-?91w\b/.test(text)) {
    return {
      productName: "Casio F-91W digital wristwatch",
      summary:
        "Casio F-91W is a quartz digital wristwatch with an LCD display, alarm, stopwatch, calendar functions, resin case/strap, and a small coin-cell battery. Confirm exact battery type, case/strap material, and whether batteries are installed for shipping documentation.",
      materialComposition: "resin/plastic case and strap, electronic quartz module, LCD display, metal components, coin-cell battery; confirm exact bill of materials",
      intendedUse: "digital wristwatch for timekeeping and consumer retail use",
      brand: "Casio",
      model: "F-91W",
      category: "digital wristwatch"
    };
  }

  return null;
}

function inferCategory(query: string, summary: string) {
  const text = `${query} ${summary}`.toLowerCase();

  if (/\b(wristwatch|watch|timepiece|digital watch|analog watch|quartz|g-shock|f-?91w)\b/.test(text)) return "digital wristwatch";
  if (/\b(bike|bicycle|frameset|tarmac|road cycling)\b/.test(text)) return "bicycle";
  if (/\b(t-?shirt|shirt|hoodie|jacket|apparel|garment)\b/.test(text)) return "apparel";
  if (/\b(shoe|sneaker|boot|trainer)\b/.test(text)) return "footwear";
  if (/\b(headphone|headphones|earbuds|earphone|speaker)\b/.test(text)) return "audio electronics";
  if (/\b(camera|dslr|mirrorless|lens)\b/.test(text)) return "camera equipment";
  if (/\b(toy|lego|doll|game set)\b/.test(text)) return "toy";
  if (/\b(chair|table|desk|sofa|furniture)\b/.test(text)) return "furniture";
  if (/\b(blender|toaster|coffee machine|kettle|vacuum)\b/.test(text)) return "household appliance";
  if (/\b(backpack|bag|luggage|suitcase|case)\b/.test(text)) return "bags and luggage";
  if (/\b(sunglasses|eyeglasses|spectacles|glasses)\b/.test(text)) return "eyewear";
  if (/\b(jewelry|jewellery|ring|necklace|bracelet)\b/.test(text)) return "jewelry";
  if (/\b(tire|tyre|brake|automotive|car part|vehicle part)\b/.test(text)) return "automotive part";
  if (/\b(phone|smartphone|iphone|galaxy)\b/.test(text)) return "consumer electronics";
  if (/\b(laptop|notebook|macbook|thinkpad)\b/.test(text)) return "computer";
  if (/\b(battery|lithium|power bank)\b/.test(text)) return "battery";
  if (/\b(cosmetic|cream|serum|lotion|makeup)\b/.test(text)) return "cosmetics";
  if (/\b(food|snack|coffee|tea|chocolate)\b/.test(text)) return "food";
  if (/\b(medical|diagnostic|surgical|sterile)\b/.test(text)) return "medical";

  return "product requiring category confirmation";
}

function inferMaterial(query: string, summary: string) {
  const text = `${query} ${summary}`.toLowerCase();

  if (/\b(wristwatch|watch|timepiece|digital watch|quartz|g-shock|f-?91w)\b/.test(text)) {
    return "case/strap materials, electronic module, display, battery, and metal components need confirmation";
  }
  if (/\b(carbon|carbon fiber|carbon fibre)\b/.test(text)) return "carbon fiber composite; confirm exact bill of materials";
  if (/\b(cotton)\b/.test(text)) return "cotton; confirm percentage composition";
  if (/\b(leather)\b/.test(text)) return "leather; confirm genuine/synthetic composition";
  if (/\b(lithium|battery)\b/.test(text)) return "lithium battery chemistry; confirm Wh rating and UN38.3 status";
  if (/\b(aluminum|aluminium)\b/.test(text)) return "aluminum; confirm alloy and component breakdown";
  if (/\b(plastic|polycarbonate|abs)\b/.test(text)) return "plastic/polymer materials; confirm exact resin";
  if (/\b(glass|mineral crystal|lens)\b/.test(text)) return "glass/mineral and frame/body materials need confirmation";
  if (/\b(steel|stainless)\b/.test(text)) return "stainless steel and other metal components; confirm grade and composition";
  if (/\b(wood)\b/.test(text)) return "wood components; confirm species, finish, and any composite materials";

  return "material composition needs confirmation";
}

function inferUse(category: string) {
  if (category === "digital wristwatch") return "timekeeping and consumer retail use";
  if (category === "bicycle") return "road cycling, racing, or high-performance recreational use";
  if (category === "apparel") return "wearable apparel for retail sale";
  if (category === "footwear") return "footwear for retail sale";
  if (category === "audio electronics") return "audio playback or communication use";
  if (category === "camera equipment") return "photography, video, or imaging use";
  if (category === "toy") return "children or hobby play/collectible use";
  if (category === "furniture") return "household, office, or commercial furnishing use";
  if (category === "household appliance") return "household or commercial appliance use";
  if (category === "bags and luggage") return "storage, carrying, travel, or retail accessory use";
  if (category === "eyewear") return "vision, sun protection, or fashion eyewear use";
  if (category === "jewelry") return "personal adornment or fashion accessory use";
  if (category === "automotive part") return "vehicle repair, maintenance, or assembly use";
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

async function searchWikipedia(query: string): Promise<{
  summary: string;
  sourceName: string;
  sourceUrl?: string;
} | null> {
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("srsearch", query);
  searchUrl.searchParams.set("format", "json");

  const searchResponse = await fetch(searchUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TariffOS quick item detector"
    },
    cache: "no-store",
    signal: AbortSignal.timeout(6000)
  });

  if (!searchResponse.ok) return null;

  const searchPayload = (await searchResponse.json()) as WikipediaSearchResponse;
  const title = searchPayload.query?.search?.[0]?.title;
  if (!title) return null;

  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const summaryResponse = await fetch(summaryUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TariffOS quick item detector"
    },
    cache: "no-store",
    signal: AbortSignal.timeout(6000)
  });

  if (!summaryResponse.ok) return null;

  const summaryPayload = (await summaryResponse.json()) as WikipediaSummaryResponse;
  const summary = clean(summaryPayload.extract ?? "");
  if (!summary) return null;

  return {
    summary,
    sourceName: summaryPayload.title ? `Wikipedia: ${summaryPayload.title}` : "Wikipedia",
    sourceUrl: summaryPayload.content_urls?.desktop?.page
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

  let wikipediaResult: Awaited<ReturnType<typeof searchWikipedia>> = null;

  try {
    wikipediaResult = await searchWikipedia(cleanQuery);
  } catch {
    wikipediaResult = null;
  }

  let internetResult: Awaited<ReturnType<typeof searchDuckDuckGo>> = null;

  try {
    internetResult = await searchDuckDuckGo(cleanQuery);
  } catch {
    internetResult = null;
  }

  const summary = wikipediaResult?.summary ?? internetResult?.summary ?? "";
  const profile = knownProductProfile(cleanQuery, summary);
  const effectiveSummary = profile?.summary ?? summary;
  const category = profile?.category ?? inferCategory(cleanQuery, effectiveSummary);
  const brand = profile?.brand ?? inferBrand(cleanQuery);
  const source = wikipediaResult ?? internetResult;

  return {
    productName: profile?.productName ?? cleanQuery,
    productDescription: buildDescription(cleanQuery, effectiveSummary, category),
    materialComposition: profile?.materialComposition ?? inferMaterial(cleanQuery, effectiveSummary),
    intendedUse: profile?.intendedUse ?? inferUse(category),
    brand,
    model: profile?.model ?? cleanQuery,
    category,
    sourceName: source?.sourceName ?? "TariffOS quick inference",
    sourceUrl: source?.sourceUrl,
    confidence: source ? "internet" : "inferred"
  };
}
