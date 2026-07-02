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

type ProductProfile = {
  productName?: string;
  summary?: string;
  materialComposition?: string;
  intendedUse?: string;
  brand?: string;
  model?: string;
  category?: string;
};

type CuratedProduct = {
  match: (queryLower: string) => boolean;
  profile: ProductProfile;
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CURATED_PRODUCTS: CuratedProduct[] = [
  {
    match: (q) => /(?:s\s*works|specialized).*tarmac|tarmac.*(?:s\s*works|specialized)|tarmac\s*sl\s*\d/.test(q),
    profile: {
      productName: "Specialized S-Works Tarmac SL9",
      summary:
        "Specialized S-Works Tarmac SL9 is a high-performance complete road racing bicycle with an aerodynamic carbon fiber frame/fork platform, drivetrain, wheels, cockpit, saddle, and braking components depending on configuration. Confirm exact build kit, frame material specification, wheel/tire setup, accessories, and whether the shipment is a complete bicycle or frameset.",
      materialComposition: "carbon fiber frame/fork, rubber tires, metal drivetrain/brake components, plastic/composite accessories; confirm exact build kit",
      intendedUse: "road cycling, racing, or high-performance recreational use",
      brand: "Specialized",
      model: "S-Works Tarmac SL9",
      category: "bicycle"
    }
  },
  {
    match: (q) => q.includes("casio") && /\bf\s*91w\b/.test(q),
    profile: {
      productName: "Casio F-91W digital wristwatch",
      summary:
        "Casio F-91W is a quartz digital wristwatch with an LCD display, alarm, stopwatch, calendar functions, resin case/strap, and a small coin-cell battery. Confirm exact battery type, case/strap material, and whether batteries are installed for shipping documentation.",
      materialComposition: "resin/plastic case and strap, electronic quartz module, LCD display, metal components, coin-cell battery; confirm exact bill of materials",
      intendedUse: "digital wristwatch for timekeeping and consumer retail use",
      brand: "Casio",
      model: "F-91W",
      category: "digital wristwatch"
    }
  },
  {
    match: (q) => q.includes("casio") && /\bg\s*shock\b/.test(q),
    profile: {
      productName: "Casio G-Shock shock-resistant wristwatch",
      summary:
        "Casio G-Shock is a shock-resistant wristwatch line designed for sport, outdoor, work, and everyday timekeeping. Depending on the exact model it may use a digital, analog, or analog-digital quartz module, a resin or metal case, mineral glass, buttons, strap or bracelet, water-resistant construction, and a battery or solar/rechargeable power system. Confirm the exact G-Shock model number, display type, power source, case/strap material, battery status, and retail accessories for customs and shipping documentation.",
      materialComposition: "resin/plastic or metal case, mineral glass, electronic quartz module, strap or bracelet, buttons, seals, metal components, and battery or solar/rechargeable power system; confirm exact model bill of materials",
      intendedUse: "shock-resistant wristwatch for timekeeping, sport, outdoor, work, or consumer retail use",
      brand: "Casio",
      model: "G-Shock",
      category: "shock-resistant wristwatch"
    }
  },
  {
    match: (q) => /\bfaber\s*castell\b/.test(q) && /\btack\s*it\b/.test(q),
    profile: {
      productName: "Faber-Castell Tack-It reusable adhesive putty",
      summary:
        "Faber-Castell Tack-It is a reusable pressure-sensitive adhesive putty used to temporarily mount lightweight items such as paper, posters, notes, photos, or small craft pieces on dry surfaces. It is handled as a stationery or office/craft adhesive product rather than a liquid glue, and the shipment may include putty strips or pads in retail packaging. Confirm exact pack size, color, safety data sheet, chemical composition, and whether any restricted adhesive or solvent content is present.",
      materialComposition: "synthetic rubber/putty adhesive compound with fillers/plasticizers and retail packaging; confirm exact SDS composition and whether solvents or restricted chemicals are present",
      intendedUse: "temporary mounting of lightweight paper, posters, notes, photos, and craft materials",
      brand: "Faber-Castell",
      model: "Tack-It",
      category: "reusable adhesive putty"
    }
  },
  {
    match: (q) =>
      /(?:tombow|taombow|tombo).*mono.*lead|mono.*(?:pencil\s*)?lead|(?:tombow|taombow|tombo).*pencil.*lead/.test(q),
    profile: {
      productName: "Tombow MONO mechanical pencil lead refill",
      summary:
        "Tombow MONO lead is a refill product for mechanical pencils, supplied as thin graphite/polymer pencil leads in a small plastic dispenser for writing, drawing, drafting, school, office, or art use. Confirm exact lead diameter, hardness grade, lead count, color, retail pack configuration, and whether the shipment contains only refills or includes a pencil body.",
      materialComposition: "graphite/carbon pencil lead with clay or polymer binder, plastic dispenser/case, label, and retail packaging; confirm exact grade, diameter, and pack count",
      intendedUse: "refill leads for mechanical pencils used in writing, drawing, drafting, school, office, or art work",
      brand: "Tombow",
      model: "MONO Lead",
      category: "mechanical pencil lead refills"
    }
  },
  {
    match: (q) => /\byves\s+rocher\b/.test(q) && q.includes("cuir") && q.includes("vetiver"),
    profile: {
      productName: "Yves Rocher Cuir Vetiver fragrance",
      summary:
        "Yves Rocher Cuir Vetiver is a personal fragrance product in the leather/vetiver scent family. For customs and shipping it should be treated as a cosmetic fragrance/perfumery product, commonly shipped as an alcohol-based liquid in a glass bottle with a spray pump, cap, and retail carton; exact concentration and size must be confirmed from the product label. Confirm whether it is eau de parfum or eau de toilette, bottle volume, alcohol percentage, ingredients/allergens, SDS or dangerous-goods status, and retail packaging details.",
      materialComposition: "alcohol-based fragrance liquid, water, aromatic compounds/fragrance oils, glass bottle, plastic/metal spray pump, cap, and paperboard packaging; confirm exact ingredient list, alcohol percentage, and volume",
      intendedUse: "personal fragrance/cosmetic use applied to the body",
      brand: "Yves Rocher",
      model: "Cuir Vetiver",
      category: "fragrance/cosmetics"
    }
  },
  {
    match: (q) => /\b(sony\s+)?wh\s*1000xm5\b/.test(q),
    profile: {
      productName: "Sony WH-1000XM5 wireless noise-canceling headphones",
      summary:
        "Sony WH-1000XM5 is a wireless over-ear noise-canceling headphone model used for audio playback and voice communication. It includes electronic audio components, microphones, Bluetooth radio hardware, ear cushions, a rechargeable lithium-ion battery, and charging/audio accessories depending on the retail configuration. Confirm battery rating, included cables/accessories, country of origin, and exact retail kit contents for customs and shipping documentation.",
      materialComposition: "plastic/polymer housing, electronic audio components, microphones, foam/synthetic leather ear cushions, metal fasteners, rechargeable lithium-ion battery; confirm exact bill of materials",
      intendedUse: "wireless audio playback, noise cancellation, and voice communication for consumer use",
      brand: "Sony",
      model: "WH-1000XM5",
      category: "audio electronics"
    }
  },
  {
    match: (q) => q.includes("canon") && /\beos\s*r50\b/.test(q),
    profile: {
      productName: "Canon EOS R50 mirrorless digital camera",
      summary:
        "Canon EOS R50 is an APS-C mirrorless interchangeable-lens digital camera body used for still photography and video recording. It contains an electronic camera body, image sensor, RF lens mount, LCD/viewfinder components, controls, memory-card interface, and a rechargeable battery; retail kits may also include a lens, charger, strap, and cables. Confirm whether the shipment is body-only or lens kit, exact accessories, battery rating, and country of origin.",
      materialComposition: "electronic camera body with image sensor, circuit boards, display components, metal/plastic housing, glass optical components if lens is included, rechargeable battery; confirm exact configuration",
      intendedUse: "still photography and video recording",
      brand: "Canon",
      model: "EOS R50",
      category: "camera equipment"
    }
  },
  {
    match: (q) => q.includes("lego") && q.includes("technic") && q.includes("bugatti") && q.includes("chiron"),
    profile: {
      productName: "LEGO Technic Bugatti Chiron construction toy set",
      summary:
        "LEGO Technic Bugatti Chiron is a construction toy/model set made of interlocking plastic building elements that assemble into a scale vehicle model. The product is used for hobby building, play, display, or collectible retail sale, and the shipment may include plastic pieces, rubber tires, paper instructions, stickers, and retail packaging. Confirm set number, piece count, age labeling, packaging configuration, and whether any electronic or battery-powered accessories are included.",
      materialComposition: "ABS plastic building elements, rubber tires, paper instructions/stickers, retail packaging; confirm whether any electronics or batteries are included",
      intendedUse: "hobby construction toy, play item, display model, or collectible retail set",
      brand: "LEGO",
      model: "Technic Bugatti Chiron",
      category: "toy"
    }
  },
  {
    match: (q) => q.includes("dyson") && q.includes("v15") && q.includes("detect"),
    profile: {
      productName: "Dyson V15 Detect cordless vacuum cleaner",
      summary:
        "Dyson V15 Detect is a cordless stick vacuum cleaner used for household floor and surface cleaning. It contains an electric motor, cyclone/dust collection assembly, plastic housing, filters, powered cleaning heads or attachments depending on the kit, and a rechargeable lithium-ion battery pack. Confirm exact kit, battery Wh rating, charger/accessories, filter contents, and country of origin for customs and dangerous-goods review.",
      materialComposition: "plastic/polymer housing, electric motor, electronic controls, filters, dust collection components, metal contacts/fasteners, rechargeable lithium-ion battery pack; confirm exact kit contents",
      intendedUse: "cordless household vacuum cleaning",
      brand: "Dyson",
      model: "V15 Detect",
      category: "household appliance"
    }
  },
  {
    match: (q) => /iphone\s*15\s*pro/.test(q),
    profile: {
      productName: "Apple iPhone 15 Pro",
      summary:
        "Apple iPhone 15 Pro is a smartphone with integrated cellular, Wi-Fi, Bluetooth, NFC and GPS radio modules, a titanium/glass body, multi-lens camera system, OLED display, and installed lithium-ion battery. Confirm storage capacity, model number, included cable/accessories, battery rating, and country of origin.",
      materialComposition: "titanium frame, glass front/back, lithium-ion battery, electronic components, camera modules, display and retail packaging",
      intendedUse: "personal mobile communication, computing, photography, and consumer retail use",
      brand: "Apple",
      model: "iPhone 15 Pro",
      category: "smartphone"
    }
  },
  {
    match: (q) => q.includes("galaxy s25 ultra") || q.includes("s25 ultra"),
    profile: {
      productName: "Samsung Galaxy S25 Ultra 5G",
      summary:
        "Samsung Galaxy S25 Ultra 5G is a smartphone with integrated cellular, Wi-Fi/Bluetooth radio modules, multi-lens camera system, display, titanium/glass body, and installed lithium-ion battery. Confirm exact storage capacity, model number, included accessories, battery rating, and country of origin.",
      materialComposition: "titanium/metal frame, glass panels, lithium-ion battery, electronic components, camera modules, display and retail packaging",
      intendedUse: "personal mobile communication, computing, photography, and consumer retail use",
      brand: "Samsung",
      model: "Galaxy S25 Ultra 5G",
      category: "smartphone"
    }
  },
  {
    match: (q) => q.includes("aeron"),
    profile: {
      productName: "Herman Miller Aeron Chair",
      summary:
        "Herman Miller Aeron is an ergonomic office task chair with a tensioned mesh seat/back, polymer frame, metal base, adjustable controls, and casters. Confirm size, upholstery/mesh type, frame/base material, included armrests, and whether shipped assembled or flat-packed.",
      materialComposition: "polymer frame, woven mesh, aluminum or metal base, steel hardware, plastic casters; confirm exact configuration",
      intendedUse: "office seating",
      brand: "Herman Miller",
      model: "Aeron",
      category: "furniture"
    }
  },
  {
    match: (q) => q.includes("powercore") || (q.includes("anker") && q.includes("power")),
    profile: {
      productName: "Anker PowerCore 10000 power bank",
      summary:
        "Anker PowerCore 10000 is a compact portable power bank with internal rechargeable lithium-ion cells, charging circuitry, plastic housing, and USB output for charging mobile devices. Confirm exact capacity in mAh/Wh, battery test documentation, ports, cables, and dangerous-goods handling requirements.",
      materialComposition: "lithium-ion cells, plastic housing, circuit board/electronics, metal contacts and retail packaging",
      intendedUse: "portable charging of mobile devices",
      brand: "Anker",
      model: "PowerCore 10000",
      category: "power bank/battery"
    }
  },
  {
    match: (q) => q.includes("yeti") && q.includes("rambler"),
    profile: {
      productName: "YETI Rambler tumbler",
      summary:
        "YETI Rambler is a double-wall vacuum-insulated drinking tumbler made for beverage storage and temperature retention, typically supplied with a removable lid. Confirm exact volume, lid type, coating/finish, and packaging configuration.",
      materialComposition: "stainless steel tumbler body, plastic lid/gasket, coating or finish if present, and retail packaging",
      intendedUse: "beverage container for hot or cold drinks",
      brand: "YETI",
      model: "Rambler",
      category: "stainless steel drinkware"
    }
  },
  {
    match: (q) => q.includes("better sweater"),
    profile: {
      productName: "Patagonia Better Sweater fleece",
      summary:
        "Patagonia Better Sweater is a fleece garment with a sweater-knit exterior and fleece interior, used as outerwear or casual apparel. Confirm exact style, gender/size, fiber composition, zipper/buttons, and country of origin.",
      materialComposition: "polyester fleece, zipper or trim materials, labels and retail packaging; confirm exact fiber percentages",
      intendedUse: "wearable outerwear/casual apparel",
      brand: "Patagonia",
      model: "Better Sweater",
      category: "apparel"
    }
  }
];

function firstRelatedTopic(topics: DuckDuckGoTopic[] = []): DuckDuckGoTopic | null {
  for (const topic of topics) {
    if (topic.Text) return topic;
    const nested = firstRelatedTopic(topic.Topics ?? []);
    if (nested) return nested;
  }

  return null;
}

function inferBrand(query: string) {
  const normalized = normalizeSearchText(query);

  if (normalized.includes("casio") || normalized.includes("g shock") || normalized.includes("f 91w")) return "Casio";
  if (normalized.includes("faber castell")) return "Faber-Castell";
  if (normalized.includes("yves rocher")) return "Yves Rocher";
  if (normalized.includes("tombow") || normalized.includes("taombow") || normalized.includes("tombo")) return "Tombow";
  if (normalized.includes("s works") || normalized.includes("tarmac")) return "Specialized";
  if (normalized.includes("iphone") || normalized.includes("macbook") || normalized.includes("airpods")) return "Apple";
  if (normalized.includes("galaxy") || normalized.includes("samsung")) return "Samsung";
  if (normalized.includes("thinkpad")) return "Lenovo";
  if (normalized.includes("air jordan")) return "Nike";
  if (normalized.includes("seiko")) return "Seiko";
  if (normalized.includes("rolex")) return "Rolex";
  if (normalized.includes("citizen")) return "Citizen";
  if (normalized.includes("garmin")) return "Garmin";
  if (normalized.includes("sony")) return "Sony";
  if (normalized.includes("canon")) return "Canon";
  if (normalized.includes("nikon")) return "Nikon";
  if (normalized.includes("lego")) return "LEGO";
  if (normalized.includes("dyson")) return "Dyson";
  if (normalized.includes("anker")) return "Anker";
  if (normalized.includes("patagonia")) return "Patagonia";
  if (normalized.includes("yeti")) return "YETI";

  return query.split(/\s+/).slice(0, 2).join(" ");
}

function inferModel(query: string, brand: string) {
  const normalizedBrand = normalizeSearchText(brand);
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedBrand || !normalizedQuery.startsWith(normalizedBrand)) {
    return query;
  }

  const brandWords = normalizedBrand.split(" ").length;
  const words = query.trim().split(/\s+/);
  return words.slice(brandWords).join(" ") || query;
}

function findCuratedProduct(query: string) {
  const normalized = normalizeSearchText(query);
  return CURATED_PRODUCTS.find((item) => item.match(normalized))?.profile ?? null;
}

function inferCategory(query: string, summary: string) {
  const text = normalizeSearchText(`${query} ${summary}`);

  if (/\b(g\s*shock|shock resistant watch|shock resistant wristwatch)\b/.test(text)) return "shock-resistant wristwatch";
  if (/\b(wristwatch|watch|timepiece|digital watch|analog watch|quartz|f\s*91w)\b/.test(text)) return "digital wristwatch";
  if (/\b(bike|bicycle|frameset|tarmac|road cycling)\b/.test(text)) return "bicycle";
  if (/\b(t\s*shirt|shirt|hoodie|jacket|apparel|garment|sweater|fleece)\b/.test(text)) return "apparel";
  if (/\b(shoe|sneaker|boot|trainer)\b/.test(text)) return "footwear";
  if (/\b(tack\s*it|blu tack|poster putty|adhesive putty|sticky tack|mounting putty|pressure sensitive adhesive)\b/.test(text)) return "reusable adhesive putty";
  if (/\b(mechanical pencil lead|pencil lead|lead refill|graphite lead|mono lead|pencil leads)\b/.test(text)) return "mechanical pencil lead refills";
  if (/\b(perfume|fragrance|parfum|eau de parfum|eau de toilette|cologne|vetiver|scent)\b/.test(text)) return "fragrance/cosmetics";
  if (/\b(pen|pencil|marker|highlighter|eraser|stationery|office supply|art supply|drafting|drawing supply)\b/.test(text)) return "stationery";
  if (/\b(headphone|headphones|earbuds|earphone|speaker|airpods)\b/.test(text)) return "audio electronics";
  if (/\b(camera|dslr|mirrorless|lens)\b/.test(text)) return "camera equipment";
  if (/\b(toy|lego|technic|construction set|building set|doll|game set)\b/.test(text)) return "toy";
  if (/\b(chair|table|desk|sofa|furniture)\b/.test(text)) return "furniture";
  if (/\b(blender|toaster|coffee machine|kettle|vacuum|cordless cleaner|stick vacuum|dyson)\b/.test(text)) return "household appliance";
  if (/\b(backpack|bag|luggage|suitcase|case)\b/.test(text)) return "bags and luggage";
  if (/\b(sunglasses|eyeglasses|spectacles|glasses)\b/.test(text)) return "eyewear";
  if (/\b(jewelry|jewellery|ring|necklace|bracelet)\b/.test(text)) return "jewelry";
  if (/\b(tire|tyre|brake|automotive|car part|vehicle part)\b/.test(text)) return "automotive part";
  if (/\b(phone|smartphone|iphone|galaxy)\b/.test(text)) return "smartphone";
  if (/\b(laptop|notebook|macbook|thinkpad)\b/.test(text)) return "computer";
  if (/\b(power bank|battery|lithium)\b/.test(text)) return "battery/power bank";
  if (/\b(cosmetic|cream|serum|lotion|makeup|shampoo|soap)\b/.test(text)) return "cosmetics";
  if (/\b(food|snack|coffee|tea|chocolate)\b/.test(text)) return "food";
  if (/\b(medical|diagnostic|surgical|sterile)\b/.test(text)) return "medical";

  return "commercial product";
}

function inferMaterial(query: string, summary: string) {
  const text = normalizeSearchText(`${query} ${summary}`);

  if (/\b(wristwatch|watch|timepiece|digital watch|quartz|g\s*shock|f\s*91w)\b/.test(text)) {
    return "case/strap materials, electronic module, display, battery, and metal components need confirmation";
  }
  if (/\b(tack\s*it|blu tack|poster putty|adhesive putty|sticky tack|mounting putty|pressure sensitive adhesive)\b/.test(text)) {
    return "synthetic rubber/putty adhesive compound, fillers/plasticizers, and retail packaging; confirm SDS composition";
  }
  if (/\b(mechanical pencil lead|pencil lead|lead refill|graphite lead|mono lead|pencil leads)\b/.test(text)) {
    return "graphite/carbon lead with clay or polymer binder plus plastic refill dispenser and retail packaging; confirm lead diameter, hardness grade, color, and pack count";
  }
  if (/\b(perfume|fragrance|parfum|eau de parfum|eau de toilette|cologne|vetiver|scent)\b/.test(text)) {
    return "alcohol-based fragrance liquid, water, aromatic compounds, glass bottle, spray pump, cap, and paperboard packaging; confirm exact ingredients, alcohol percentage, and volume";
  }
  if (/\b(pen|pencil|marker|highlighter|eraser|notebook|stationery|office supply|art supply)\b/.test(text)) {
    return "stationery materials such as plastic, wood, graphite/ink, rubber, paper, metal parts, and retail packaging; confirm exact item composition";
  }
  if (/\b(headphone|headphones|earbuds|earphone|speaker|airpods)\b/.test(text)) {
    return "plastic/polymer housings, electronic audio components, cables/accessories, and any rechargeable battery need confirmation";
  }
  if (/\b(toy|lego|technic|construction set|building set)\b/.test(text)) {
    return "plastic building/toy components, packaging, and any rubber/electronic accessories need confirmation";
  }
  if (/\b(vacuum|cordless cleaner|stick vacuum|dyson)\b/.test(text)) {
    return "plastic/polymer housing, electric motor, filters, accessories, and rechargeable battery details need confirmation";
  }
  if (/\b(carbon|carbon fiber|carbon fibre)\b/.test(text)) return "carbon fiber composite; confirm exact bill of materials";
  if (/\b(cotton)\b/.test(text)) return "cotton; confirm percentage composition";
  if (/\b(leather)\b/.test(text)) return "leather; confirm genuine/synthetic composition";
  if (/\b(lithium|battery|power bank)\b/.test(text)) return "lithium battery chemistry; confirm Wh rating and UN38.3 status";
  if (/\b(aluminum|aluminium)\b/.test(text)) return "aluminum; confirm alloy and component breakdown";
  if (/\b(plastic|polycarbonate|abs)\b/.test(text)) return "plastic/polymer materials; confirm exact resin";
  if (/\b(glass|mineral crystal|lens)\b/.test(text)) return "glass/mineral and frame/body materials need confirmation";
  if (/\b(steel|stainless)\b/.test(text)) return "stainless steel and other metal components; confirm grade and composition";
  if (/\b(wood)\b/.test(text)) return "wood components; confirm species, finish, and any composite materials";

  return "composition must be confirmed from supplier specifications, product label, photos, invoice, and packaging; check for batteries, liquids, chemicals, wood, leather, textile fiber content, or regulated components";
}

function inferUse(category: string) {
  if (category === "shock-resistant wristwatch") return "timekeeping and consumer retail use for sport, outdoor, work, or everyday wear";
  if (category === "digital wristwatch") return "timekeeping and consumer retail use";
  if (category === "bicycle") return "road cycling, racing, or high-performance recreational use";
  if (category === "apparel") return "wearable apparel for retail sale";
  if (category === "footwear") return "footwear for retail sale";
  if (category === "reusable adhesive putty") return "temporary mounting of lightweight paper, posters, notes, photos, or craft materials";
  if (category === "mechanical pencil lead refills") return "refill leads for mechanical pencils used in writing, drawing, drafting, school, office, or art work";
  if (category === "fragrance/cosmetics") return "personal fragrance or cosmetic use";
  if (category === "stationery") return "writing, drawing, school, office, or craft use";
  if (category === "audio electronics") return "audio playback or communication use";
  if (category === "camera equipment") return "photography, video, or imaging use";
  if (category === "toy") return "children or hobby play/collectible use";
  if (category === "furniture") return "household, office, or commercial furnishing use";
  if (category === "household appliance") return "household or commercial appliance use";
  if (category === "bags and luggage") return "storage, carrying, travel, or retail accessory use";
  if (category === "eyewear") return "vision, sun protection, or fashion eyewear use";
  if (category === "jewelry") return "personal adornment or fashion accessory use";
  if (category === "automotive part") return "vehicle repair, maintenance, or assembly use";
  if (category === "smartphone") return "personal mobile communication, computing, photography, and consumer retail use";
  if (category === "computer") return "portable computing use";
  if (category === "battery/power bank") return "portable power or equipment power source";
  if (category === "cosmetics") return "personal care or cosmetic use";
  if (category === "food") return "human consumption";
  if (category === "medical") return "medical, diagnostic, or clinical use; confirm claims";
  if (category === "commercial product") return "retail, business, or consumer use based on the buyer order; confirm exact product function";

  return "commercial/consumer use; confirm intended use";
}

function buildDescription(query: string, summary: string, category: string) {
  const base = summary
    ? clean(summary)
    : `${query} is treated as a best-effort ${category} profile from the quick-search text. Confirm exact product type, model, materials, accessories, packaging, and whether it is shipped complete, as a refill/consumable, or as spare parts.`;

  const confirmation =
    "Customs data to confirm: exact model/configuration, material composition, function, included accessories, quantity, country of origin, and whether the shipment contains batteries, liquids, regulated claims, or spare parts.";

  return base.toLowerCase().includes("customs data to confirm") ? base : `${base} ${confirmation}`;
}

function meaningfulTokens(value: string) {
  const ignored = new Set(["the", "and", "for", "with", "from", "product", "item", "model", "brand"]);

  return normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !ignored.has(token));
}

function isRelevantLookup(query: string, result: { summary: string; sourceName: string } | null) {
  if (!result) return false;

  const haystack = normalizeSearchText(`${result.sourceName} ${result.summary}`);
  const tokens = meaningfulTokens(query);
  if (!tokens.length) return false;

  const hits = tokens.filter((token) => haystack.includes(token));
  const hasModelHit = tokens.some((token) => /\d/.test(token) && haystack.includes(token));
  const hasDistinctiveHit = tokens.some((token) => token.length >= 7 && haystack.includes(token));

  return hits.length >= Math.min(2, tokens.length) || hasModelHit || hasDistinctiveHit;
}

function quickFindFromProfile(query: string, profile: ProductProfile): QuickFindItem {
  const summary = profile.summary ?? "";
  const category = profile.category ?? inferCategory(query, summary);
  const brand = profile.brand ?? inferBrand(query);

  return {
    productName: profile.productName ?? query,
    productDescription: buildDescription(query, summary, category),
    materialComposition: profile.materialComposition ?? inferMaterial(query, summary),
    intendedUse: profile.intendedUse ?? inferUse(category),
    brand,
    model: profile.model ?? inferModel(query, brand),
    category,
    sourceName: "TariffOS free curated profile",
    confidence: "inferred"
  };
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

  const directProfile = findCuratedProduct(cleanQuery);
  if (directProfile) {
    return quickFindFromProfile(cleanQuery, directProfile);
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

  const source = [wikipediaResult, internetResult].find((result) => isRelevantLookup(cleanQuery, result)) ?? null;
  const summary = source?.summary ?? "";
  const sourceProfile = findCuratedProduct(`${cleanQuery} ${summary}`);
  if (sourceProfile) {
    return quickFindFromProfile(cleanQuery, sourceProfile);
  }

  const category = inferCategory(cleanQuery, summary);
  const brand = inferBrand(cleanQuery);

  return {
    productName: cleanQuery,
    productDescription: buildDescription(cleanQuery, summary, category),
    materialComposition: inferMaterial(cleanQuery, summary),
    intendedUse: inferUse(category),
    brand,
    model: inferModel(cleanQuery, brand),
    category,
    sourceName: source?.sourceName ?? "TariffOS free inference",
    sourceUrl: source?.sourceUrl,
    confidence: source ? "internet" : "inferred"
  };
}
