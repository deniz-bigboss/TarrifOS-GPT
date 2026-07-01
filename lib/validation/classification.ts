import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);
const optionalNumber = (schema: z.ZodNumber) => z.preprocess(emptyToUndefined, schema.optional());

export const uploadedDocumentSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSizeBytes: optionalNumber(z.coerce.number().finite().nonnegative()),
  storagePath: z.string().optional(),
  extractedText: z.string().optional()
});

export const productInputSchema = z.object({
  productName: z.string().min(2, "Product name is required.").max(160),
  productDescription: z.string().min(8, "Add a specific product description.").max(4000),
  materialComposition: z.string().max(1000).optional().or(z.literal("")),
  intendedUse: z.string().max(1000).optional().or(z.literal("")),
  brand: z.string().max(120).optional().or(z.literal("")),
  model: z.string().max(120).optional().or(z.literal("")),
  sku: z.string().max(120).optional().or(z.literal("")),
  category: z.string().max(120).optional().or(z.literal("")),
  supplierCountry: z.string().max(80).optional().or(z.literal("")),
  originCountry: z.string().min(2, "Origin country is required.").max(80),
  destinationCountry: z.string().min(2, "Destination country is required.").max(80),
  importOrExport: z.enum(["import", "export"]).default("import").optional(),
  declaredValue: optionalNumber(z.coerce.number().finite("Declared value must be a valid number.").nonnegative("Declared value cannot be negative.")),
  currency: z.string().min(3).max(3).default("EUR").optional(),
  quantity: optionalNumber(z.coerce.number().finite("Quantity must be a valid number.").positive("Quantity must be greater than zero.")),
  unitWeight: optionalNumber(z.coerce.number().finite("Unit weight must be a valid number.").nonnegative("Unit weight cannot be negative.")),
  shippingMethod: z.string().max(120).optional().or(z.literal("")),
  documents: z.array(uploadedDocumentSchema).optional()
});

export const feedbackSchema = z.object({
  actualCode: z.string().max(80).optional().or(z.literal("")),
  wasCorrect: z.boolean().optional(),
  brokerNotes: z.string().max(4000).optional().or(z.literal("")),
  shipmentCleared: z.boolean().optional(),
  delayOccurred: z.boolean().optional(),
  penaltyOccurred: z.boolean().optional()
});

export const apiClassifyRequestSchema = productInputSchema;

export type ProductInputPayload = z.infer<typeof productInputSchema>;
export type FeedbackPayload = z.infer<typeof feedbackSchema>;
