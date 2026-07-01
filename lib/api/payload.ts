import type { ProductInput } from "@/types/classification";

type UnknownRecord = Record<string, unknown>;

function pickString(payload: UnknownRecord, camel: string, snake: string) {
  return payload[camel] ?? payload[snake];
}

export function mapIncomingProductPayload(payload: UnknownRecord): ProductInput {
  return {
    productName: String(pickString(payload, "productName", "product_name") ?? ""),
    productDescription: String(pickString(payload, "productDescription", "product_description") ?? ""),
    materialComposition: pickString(payload, "materialComposition", "material_composition") as string | undefined,
    intendedUse: pickString(payload, "intendedUse", "intended_use") as string | undefined,
    brand: payload.brand as string | undefined,
    model: payload.model as string | undefined,
    sku: payload.sku as string | undefined,
    category: payload.category as string | undefined,
    supplierCountry: pickString(payload, "supplierCountry", "supplier_country") as string | undefined,
    originCountry: String(pickString(payload, "originCountry", "origin_country") ?? ""),
    destinationCountry: String(pickString(payload, "destinationCountry", "destination_country") ?? ""),
    importOrExport: (pickString(payload, "importOrExport", "import_or_export") as ProductInput["importOrExport"]) ?? "import",
    declaredValue: pickString(payload, "declaredValue", "declared_value") as number | undefined,
    currency: (payload.currency as string | undefined) ?? "EUR",
    quantity: payload.quantity as number | undefined,
    unitWeight: pickString(payload, "unitWeight", "unit_weight") as number | undefined,
    shippingMethod: pickString(payload, "shippingMethod", "shipping_method") as string | undefined,
    documents: payload.documents as ProductInput["documents"]
  };
}
