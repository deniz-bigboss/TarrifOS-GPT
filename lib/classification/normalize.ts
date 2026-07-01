import { productInputSchema } from "@/lib/validation/classification";
import type { NormalizedProductInput, ProductInput } from "@/types/classification";

function emptyToUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, entry === "" ? undefined : entry])
  ) as T;
}

export function normalizeProductInput(payload: unknown): NormalizedProductInput {
  const parsed = emptyToUndefined(productInputSchema.parse(payload)) as ProductInput;
  const normalizedDescription = [
    parsed.productName,
    parsed.productDescription,
    parsed.materialComposition,
    parsed.intendedUse,
    parsed.brand,
    parsed.model,
    parsed.category,
    parsed.sku
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    ...parsed,
    importOrExport: parsed.importOrExport ?? "import",
    currency: parsed.currency ?? "EUR",
    normalizedDescription,
    searchText: [
      normalizedDescription,
      parsed.originCountry,
      parsed.destinationCountry,
      parsed.shippingMethod
    ]
      .filter(Boolean)
      .join(" ")
  };
}
