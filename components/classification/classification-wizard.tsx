"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, FileText, FileUp, Loader2, Lock, PackageSearch, Route, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useForm, type FieldErrors } from "react-hook-form";
import type { ProductInputPayload } from "@/lib/validation/classification";
import { productInputSchema } from "@/lib/validation/classification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import type { QuickFindItem } from "@/lib/item-detector/quick-find";
import type { UploadedDocumentInput } from "@/types/classification";

const steps = [
  { label: "Product basics", description: "Identity and composition", icon: PackageSearch },
  { label: "Trade lane", description: "Origin, destination, value", icon: Route },
  { label: "Documents", description: "Invoices and specs", icon: FileText },
  { label: "Agent brief", description: "Ready for planning", icon: ClipboardCheck }
];
type WizardField = keyof ProductInputPayload;
type QuickFindStatus = "idle" | "loading" | "success" | "error";

const defaultValues: ProductInputPayload = {
  productName: "Men's short-sleeve knitted t-shirt",
  productDescription: "100% cotton knitted short-sleeve t-shirt for retail apparel sale",
  materialComposition: "100% cotton",
  intendedUse: "apparel",
  brand: "Demo Brand",
  model: "",
  sku: "TSHIRT-COTTON-001",
  category: "apparel",
  supplierCountry: "TR",
  originCountry: "TR",
  destinationCountry: "DE",
  importOrExport: "import",
  declaredValue: 1200,
  currency: "EUR",
  quantity: 100,
  unitWeight: 0.18,
  shippingMethod: "road freight",
  documents: []
};

const stepFields: WizardField[][] = [
  ["productName", "category", "productDescription", "materialComposition", "intendedUse", "brand", "model", "sku"],
  [
    "supplierCountry",
    "originCountry",
    "destinationCountry",
    "importOrExport",
    "declaredValue",
    "currency",
    "quantity",
    "unitWeight",
    "shippingMethod"
  ],
  ["documents"],
  []
];
const productFields = stepFields[0];

function getFirstErrorStep(formErrors: FieldErrors<ProductInputPayload>) {
  const errorFields = Object.keys(formErrors) as WizardField[];
  const stepIndex = stepFields.findIndex((fields) => fields.some((field) => errorFields.includes(field)));

  return stepIndex >= 0 ? stepIndex : 0;
}

export function ClassificationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [documents, setDocuments] = useState<UploadedDocumentInput[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [quickFindEnabled, setQuickFindEnabled] = useState(false);
  const [quickFindQuery, setQuickFindQuery] = useState("");
  const [quickFindStatus, setQuickFindStatus] = useState<QuickFindStatus>("idle");
  const [quickFindError, setQuickFindError] = useState<string | null>(null);
  const [quickFindItem, setQuickFindItem] = useState<QuickFindItem | null>(null);
  const form = useForm<ProductInputPayload>({
    resolver: zodResolver(productInputSchema),
    defaultValues
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
    setValue,
    trigger,
    watch
  } = form;

  const reviewValues = watch();
  const snapshotRows = [
    { label: "Product", value: reviewValues.productName || "Not provided" },
    { label: "Lane", value: `${reviewValues.originCountry || "--"} -> ${reviewValues.destinationCountry || "--"}` },
    { label: "Value", value: `${reviewValues.declaredValue ?? "Not set"} ${reviewValues.currency || ""}` },
    { label: "Quantity", value: reviewValues.quantity ? String(reviewValues.quantity) : "Not set" },
    { label: "Documents", value: documents.length ? `${documents.length} attached` : "None attached" }
  ];
  const productFieldsLocked = quickFindEnabled;
  const lockedFieldProps = productFieldsLocked
    ? {
        readOnly: true,
        tabIndex: -1,
        "aria-disabled": true
      }
    : {};

  const applyQuickFindItem = useCallback((item: QuickFindItem) => {
    setValue("productName", item.productName, { shouldDirty: true, shouldValidate: true });
    setValue("productDescription", item.productDescription, { shouldDirty: true, shouldValidate: true });
    setValue("category", item.category ?? "", { shouldDirty: true });
    setValue("materialComposition", item.materialComposition ?? "", { shouldDirty: true });
    setValue("intendedUse", item.intendedUse ?? "", { shouldDirty: true });
    setValue("brand", item.brand ?? "", { shouldDirty: true });
    setValue("model", item.model ?? "", { shouldDirty: true });
    setValue("sku", "", { shouldDirty: true });
  }, [setValue]);

  const runQuickFind = useCallback(async (query: string, signal?: AbortSignal) => {
    const trimmed = query.trim();

    if (trimmed.length < 3) {
      setQuickFindStatus("idle");
      setQuickFindError(null);
      setQuickFindItem(null);
      setValue("productName", trimmed, { shouldDirty: true, shouldValidate: true });
      return;
    }

    setQuickFindStatus("loading");
    setQuickFindError(null);

    let response: Response;
    try {
      response = await fetch("/api/items/quick-find", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: trimmed }),
        signal
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setQuickFindStatus("error");
      setQuickFindError("Quick item lookup could not reach the internet lookup service.");
      return;
    }

    let payload: { item?: QuickFindItem; error?: string } = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok || !payload.item) {
      setQuickFindStatus("error");
      setQuickFindError(payload.error ?? `Quick item lookup failed with status ${response.status}.`);
      return;
    }

    setQuickFindItem(payload.item);
    setQuickFindStatus("success");
    applyQuickFindItem(payload.item);
    await trigger(productFields);
  }, [applyQuickFindItem, setValue, trigger]);

  function toggleQuickFind(enabled: boolean) {
    setQuickFindEnabled(enabled);
    setServerError(null);

    if (enabled) {
      const currentName = getValues("productName");
      const initialQuery = currentName === defaultValues.productName ? "" : currentName;
      setQuickFindQuery(initialQuery);
      setQuickFindStatus(initialQuery.trim().length >= 3 ? "loading" : "idle");
      setQuickFindError(null);
      setQuickFindItem(null);
      return;
    }

    setQuickFindStatus("idle");
    setQuickFindError(null);
    setQuickFindItem(null);
  }

  useEffect(() => {
    if (!quickFindEnabled) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void runQuickFind(quickFindQuery, controller.signal);
    }, 700);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [quickFindEnabled, quickFindQuery, runQuickFind]);

  async function onSubmit(values: ProductInputPayload) {
    setServerError(null);

    let response: Response;
    try {
      response = await fetch("/api/classifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...values,
          documents
        })
      });
    } catch {
      setServerError("Could not reach the classification service. Please try again.");
      return;
    }

    let payload: { classification_id?: string; error?: string } = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      setServerError(payload.error ?? `Classification failed with status ${response.status}.`);
      return;
    }

    if (!payload.classification_id) {
      setServerError("Classification finished without a result ID. Please try again.");
      return;
    }

    router.push(`/classifications/${payload.classification_id}`);
    router.refresh();
  }

  function onInvalid(formErrors: FieldErrors<ProductInputPayload>) {
    setStep(getFirstErrorStep(formErrors));
    setServerError("Some fields need attention. I moved you to the first section with an issue.");
  }

  async function onNextStep() {
    setServerError(null);

    if (step === 0 && quickFindEnabled) {
      if (quickFindQuery.trim().length < 3) {
        setServerError("Enter at least 3 characters in quick find before continuing.");
        return;
      }

      if (quickFindStatus === "loading") {
        setServerError("Quick item detector is still searching. Wait for the item to apply before continuing.");
        return;
      }
    }

    const currentStepFields = stepFields[step] ?? [];
    const isStepValid = currentStepFields.length ? await trigger(currentStepFields, { shouldFocus: true }) : true;

    if (!isStepValid) {
      setServerError("Some fields on this step need attention before you continue.");
      return;
    }

    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  function onFilesSelected(files: FileList | null) {
    if (!files) return;
    setDocuments(
      Array.from(files).map((file) => ({
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSizeBytes: file.size,
        extractedText: "PDF/text extraction placeholder for MVP."
      }))
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          {steps.map(({ label, description, icon: Icon }, index) => {
            const isActive = step === index;
            const isComplete = step > index;

            return (
              <button
                type="button"
                key={label}
                aria-current={isActive ? "step" : undefined}
                onClick={() => setStep(index)}
                className={cn(
                  "group rounded-lg border p-3 text-left shadow-sm transition-colors",
                  isActive
                    ? "border-slate-950 bg-slate-950 text-white"
                    : isComplete
                      ? "border-emerald-200 bg-emerald-50 text-slate-900 hover:border-emerald-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                      isActive ? "bg-white/10 text-white" : isComplete ? "bg-white text-emerald-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-xs font-medium", isActive ? "text-slate-300" : "text-slate-500")}>Step {index + 1}</span>
                    <span className="block truncate text-sm font-semibold">{label}</span>
                  </span>
                </span>
                <span className={cn("mt-3 block text-xs", isActive ? "text-slate-300" : "text-slate-500")}>{description}</span>
              </button>
            );
          })}
        </div>

        {serverError ? (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </div>
        ) : null}

        {step === 0 ? (
          <Card className="overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm">
                  <PackageSearch className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Product basics</h2>
                  <p className="mt-1 text-sm text-slate-600">Describe the item as a broker would need to see it.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">Quick item detector</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">Online lookup fills and locks the product fields.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={quickFindEnabled}
                    onClick={() => toggleQuickFind(!quickFindEnabled)}
                    className={cn(
                      "flex h-9 w-16 shrink-0 items-center rounded-full border p-1 transition-colors",
                      quickFindEnabled ? "border-emerald-700 bg-emerald-700" : "border-slate-300 bg-white"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition-transform",
                        quickFindEnabled ? "translate-x-7 text-emerald-700" : "translate-x-0"
                      )}
                    >
                      {quickFindEnabled ? <Lock className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                </div>

                {quickFindEnabled ? (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="quickFindQuery">Quick find</Label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="quickFindQuery"
                          value={quickFindQuery}
                          onChange={(event) => setQuickFindQuery(event.target.value)}
                          placeholder="S-Works Tarmac SL9"
                          className="pl-9"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <div className="min-h-6 text-sm">
                      {quickFindStatus === "loading" ? (
                        <p className="flex items-center gap-2 font-medium text-blue-700">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching online sources
                        </p>
                      ) : null}
                      {quickFindStatus === "success" && quickFindItem ? (
                        <p className="font-medium text-emerald-700">
                          Applied {quickFindItem.confidence === "internet" ? "internet result" : "inferred item profile"} from {quickFindItem.sourceName}
                          {quickFindItem.sourceUrl ? (
                            <a href={quickFindItem.sourceUrl} target="_blank" rel="noreferrer" className="ml-1 underline">
                              source
                            </a>
                          ) : null}
                        </p>
                      ) : null}
                      {quickFindStatus === "error" ? (
                        <p className="font-medium text-red-700">{quickFindError}</p>
                      ) : null}
                      {quickFindStatus === "idle" ? (
                        <p className="text-slate-500">Product fields are locked while detector mode is active.</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className={cn(
                  "mt-6 grid gap-5 md:grid-cols-2",
                  productFieldsLocked && "pointer-events-none select-none opacity-45 grayscale"
                )}
              >
              <div className="space-y-2">
                <Label htmlFor="productName">Product name</Label>
                <Input id="productName" {...register("productName")} {...lockedFieldProps} />
                <FieldError message={errors.productName?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" {...register("category")} {...lockedFieldProps} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="productDescription">Product description</Label>
                <Textarea id="productDescription" {...register("productDescription")} {...lockedFieldProps} />
                <FieldError message={errors.productDescription?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialComposition">Material composition</Label>
                <Input id="materialComposition" {...register("materialComposition")} {...lockedFieldProps} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intendedUse">Intended use</Label>
                <Input id="intendedUse" {...register("intendedUse")} {...lockedFieldProps} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" {...register("brand")} {...lockedFieldProps} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" {...register("model")} {...lockedFieldProps} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" {...register("sku")} {...lockedFieldProps} />
              </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 1 ? (
          <Card className="overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm">
                  <Route className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Trade lane and value</h2>
                  <p className="mt-1 text-sm text-slate-600">Country codes such as TR, DE, UK, and US are supported by the seed data.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 p-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="supplierCountry">Supplier country</Label>
                <Input id="supplierCountry" {...register("supplierCountry")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originCountry">Origin country</Label>
                <Input id="originCountry" {...register("originCountry")} />
                <FieldError message={errors.originCountry?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationCountry">Destination country</Label>
                <Input id="destinationCountry" {...register("destinationCountry")} />
                <FieldError message={errors.destinationCountry?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="importOrExport">Trade direction</Label>
                <Select id="importOrExport" {...register("importOrExport")}>
                  <option value="import">Import</option>
                  <option value="export">Export</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="declaredValue">Declared value</Label>
                <Input id="declaredValue" type="number" step="0.01" {...register("declaredValue")} />
                <FieldError message={errors.declaredValue?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" maxLength={3} {...register("currency")} />
                <FieldError message={errors.currency?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" step="1" {...register("quantity")} />
                <FieldError message={errors.quantity?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitWeight">Unit weight</Label>
                <Input id="unitWeight" type="number" step="0.01" {...register("unitWeight")} />
                <FieldError message={errors.unitWeight?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingMethod">Shipping method</Label>
                <Input id="shippingMethod" {...register("shippingMethod")} />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card className="overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Optional document metadata</h2>
                  <p className="mt-1 text-sm text-slate-600">The MVP stores metadata and leaves extraction as a placeholder hook.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-emerald-300 bg-emerald-50/70 p-8 text-center transition-colors hover:bg-emerald-50">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm">
                  <FileUp className="h-6 w-6" />
                </span>
                <span className="mt-3 text-sm font-semibold text-slate-950">Upload invoice, packing list, spec sheet, or catalog</span>
                <span className="mt-1 text-xs text-slate-500">PDF and text metadata accepted for now</span>
                <input
                  className="hidden"
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  multiple
                  onChange={(event) => onFilesSelected(event.target.files)}
                />
              </label>
              {documents.length ? (
                <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                  {documents.map((document) => (
                    <div key={document.fileName} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="truncate font-medium text-slate-800">{document.fileName}</span>
                      <span className="shrink-0 text-xs text-slate-500">{document.fileType}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card className="overflow-hidden">
            <CardHeader className="bg-slate-50/80 p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm">
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Review request</h2>
              <p className="mt-1 text-sm text-slate-600">Submit to generate classification, document, cost, and shipment execution guidance.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200">
                {[
                  ["Product", reviewValues.productName],
                  ["Description", reviewValues.productDescription],
                  ["Material", reviewValues.materialComposition],
                  ["Use", reviewValues.intendedUse],
                  ["Lane", `${reviewValues.originCountry} -> ${reviewValues.destinationCountry}`],
                  ["Value", `${reviewValues.declaredValue ?? ""} ${reviewValues.currency ?? ""}`]
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-1 px-6 py-4 sm:grid-cols-[150px_minmax(0,1fr)]">
                    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                    <p className="text-sm font-medium text-slate-950">{value || "Not provided"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <Button type="button" variant="outline" disabled={step === 0 || isSubmitting} onClick={() => setStep((value) => value - 1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button
              type="button"
              onClick={() => {
                void onNextStep();
              }}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generate shipment plan
            </Button>
          )}
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-7 xl:self-start">
        <Card className="overflow-hidden border-slate-950 bg-slate-950 text-white">
          <CardHeader className="border-white/10 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-400/15 text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-white">Request snapshot</h2>
                <p className="mt-1 text-xs text-slate-400">{steps[step]?.label ?? "Current step"}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="space-y-3">
              {snapshotRows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                  <span className="text-xs font-medium uppercase text-slate-400">{row.label}</span>
                  <span className="max-w-[180px] text-right text-sm font-semibold text-white">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs font-semibold uppercase text-emerald-300">Classification flow</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Candidate codes, risk flags, document tasks, cost actions, and a shipment plan are generated after the final step.
              </p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
