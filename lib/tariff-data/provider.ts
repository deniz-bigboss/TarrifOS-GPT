import type { TariffDataProvider } from "@/types/tariff";
import { SeedTariffDataProvider } from "./seed-provider";

let provider: TariffDataProvider | null = null;

export function getTariffDataProvider(): TariffDataProvider {
  provider ??= new SeedTariffDataProvider();
  return provider;
}
