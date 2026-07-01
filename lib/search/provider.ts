import type { NormalizedProductInput } from "@/types/classification";
import type { TariffCandidate } from "@/types/tariff";
import { getTariffDataProvider } from "@/lib/tariff-data/provider";

export type CandidateSearchProvider = {
  retrieveCandidateCodes(input: NormalizedProductInput): Promise<TariffCandidate[]>;
};

export class KeywordCandidateSearchProvider implements CandidateSearchProvider {
  async retrieveCandidateCodes(input: NormalizedProductInput) {
    const tariffDataProvider = getTariffDataProvider();
    return tariffDataProvider.searchCodes(input.searchText, input.destinationCountry);
  }
}

export class FutureVectorCandidateSearchProvider implements CandidateSearchProvider {
  async retrieveCandidateCodes(): Promise<TariffCandidate[]> {
    throw new Error("FutureVectorCandidateSearchProvider is disabled. Use keyword search until semantic search is justified.");
  }
}

export function getCandidateSearchProvider(): CandidateSearchProvider {
  return new KeywordCandidateSearchProvider();
}
