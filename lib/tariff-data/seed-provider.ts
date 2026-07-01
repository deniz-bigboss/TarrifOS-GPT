import type { DutyMeasure, TariffCandidate, TariffCodeRecord, TariffDataProvider } from "@/types/tariff";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { seedTariffCodes } from "./seed-data";

const destinationJurisdiction: Record<string, TariffCodeRecord["jurisdiction"]> = {
  DE: "EU",
  FR: "EU",
  NL: "EU",
  ES: "EU",
  IT: "EU",
  UK: "UK",
  GB: "UK",
  US: "US",
  USA: "US",
  TR: "TR"
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.\-\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function jurisdictionForDestination(destinationCountry: string) {
  const normalized = destinationCountry.trim().toUpperCase();
  return destinationJurisdiction[normalized] ?? "HS";
}

export class SeedTariffDataProvider implements TariffDataProvider {
  private async loadRecords(): Promise<TariffCodeRecord[]> {
    if (!isSupabaseServiceConfigured()) {
      return seedTariffCodes;
    }

    const client = createSupabaseServiceClient();
    if (!client) return seedTariffCodes;

    const { data, error } = await client.from("tariff_codes").select("*").limit(500);

    if (error || !data?.length) {
      return seedTariffCodes;
    }

    return data.map((record) => ({
      id: record.id,
      code: record.code,
      jurisdiction: record.jurisdiction,
      title: record.title,
      description: record.description,
      keywords: record.keywords ?? [],
      chapter: record.chapter ?? "",
      section: record.section ?? "",
      dutyRatePlaceholder: record.duty_rate_placeholder ?? "Duty rate unavailable in seed data",
      requiredDocuments: record.required_documents ?? [],
      restrictionNotes: record.restriction_notes ?? [],
      riskLevel: record.risk_level ?? "low"
    }));
  }

  async searchCodes(query: string, destinationCountry: string): Promise<TariffCandidate[]> {
    const tokens = tokenize(query);
    const jurisdiction = jurisdictionForDestination(destinationCountry);
    const records = await this.loadRecords();

    const scored = records
      .map((record) => {
        const searchable = [
          record.code,
          record.title,
          record.description,
          record.chapter,
          record.section,
          ...record.keywords
        ]
          .join(" ")
          .toLowerCase();
        const matchedKeywords = record.keywords.filter((keyword) =>
          tokens.some((token) => keyword.toLowerCase().includes(token) || token.includes(keyword.toLowerCase()))
        );
        const tokenScore = tokens.reduce((score, token) => {
          if (record.code.toLowerCase().includes(token)) return score + 8;
          if (record.title.toLowerCase().includes(token)) return score + 5;
          if (record.keywords.some((keyword) => keyword.toLowerCase().includes(token))) return score + 4;
          if (searchable.includes(token)) return score + 1;
          return score;
        }, 0);
        const jurisdictionBoost = record.jurisdiction === jurisdiction ? 1.2 : record.jurisdiction === "HS" ? 1 : 0.9;

        return {
          ...record,
          matchedKeywords,
          score: Number((tokenScore * jurisdictionBoost).toFixed(2)),
          source: "seed-tariff-codes"
        };
      })
      .filter((record) => record.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (scored.length > 0) {
      return scored;
    }

    return records.slice(0, 8).map((record) => ({
      ...record,
      matchedKeywords: [],
      score: 0.2,
      source: "seed-tariff-codes"
    }));
  }

  async getCodeDetails(code: string, _destinationCountry = ""): Promise<TariffCodeRecord | null> {
    const records = await this.loadRecords();
    return records.find((record) => record.code === code) ?? null;
  }

  async getDutyMeasures(
    code: string,
    originCountry: string,
    destinationCountry: string
  ): Promise<DutyMeasure> {
    const record = await this.getCodeDetails(code, destinationCountry);

    return {
      code,
      originCountry,
      destinationCountry,
      dutyRatePlaceholder: record?.dutyRatePlaceholder ?? "Duty rate unavailable in seed data",
      notes: [
        "Seed tariff data is illustrative only.",
        "Preferential treatment, anti-dumping duties, VAT, excise, and quotas require official verification."
      ]
    };
  }

  async getRequiredDocuments(code: string): Promise<string[]> {
    const record = await this.getCodeDetails(code, "");
    return record?.requiredDocuments ?? ["commercial invoice", "packing list"];
  }

  async getRestrictions(code: string): Promise<string[]> {
    const record = await this.getCodeDetails(code, "");
    return record?.restrictionNotes ?? [];
  }
}
