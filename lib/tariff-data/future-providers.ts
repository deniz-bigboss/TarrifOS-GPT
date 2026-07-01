import type { DutyMeasure, TariffCandidate, TariffCodeRecord, TariffDataProvider } from "@/types/tariff";

export class FutureOfficialTariffProvider implements TariffDataProvider {
  async searchCodes(): Promise<TariffCandidate[]> {
    throw new Error("Official tariff adapters should be added one jurisdiction at a time after customer validation.");
  }

  async getCodeDetails(): Promise<TariffCodeRecord | null> {
    throw new Error("Official tariff adapters are disabled in the MVP.");
  }

  async getDutyMeasures(): Promise<DutyMeasure> {
    throw new Error("Official tariff adapters are disabled in the MVP.");
  }

  async getRequiredDocuments(): Promise<string[]> {
    throw new Error("Official tariff adapters are disabled in the MVP.");
  }

  async getRestrictions(): Promise<string[]> {
    throw new Error("Official tariff adapters are disabled in the MVP.");
  }
}

export class FuturePaidTariffProvider extends FutureOfficialTariffProvider {
  async searchCodes(): Promise<TariffCandidate[]> {
    throw new Error("Paid tariff-data APIs are not part of the free-first MVP.");
  }
}
