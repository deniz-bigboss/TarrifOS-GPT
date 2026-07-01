import Image from "next/image";
import { ArrowRight, CheckCircle2, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

const workflow = [
  "Normalize product and trade-lane data",
  "Retrieve seed HS-style candidates",
  "Generate document and compliance gates",
  "Produce cost actions and a shipment plan"
];

const customerTypes = [
  "Shopify and e-commerce importers",
  "Small importers/exporters",
  "Freight forwarders handling repeat SKUs",
  "Customs brokers doing pre-classification"
];

export default function LandingPage() {
  return (
    <main className="bg-white">
      <SiteNav />
      <section className="relative min-h-[92vh] overflow-hidden bg-slate-950">
        <Image
          src="/tariffos-hero.png"
          alt="Customs operations desk with tariff classification workflow"
          fill
          priority
          className="object-cover opacity-[0.78]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/72 to-slate-950/20" />
        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-4 pb-24 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge className="border-white/20 bg-white/10 text-white">AI shipping operations agent</Badge>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-normal text-white sm:text-6xl">
              TariffOS
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              An AI-assisted workspace for importers and exporters that turns product facts into HS recommendations,
              document checklists, compliance checkpoints, cost-saving actions, and shipment execution plans.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/auth/signup" size="lg">
                Create shipment plan
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/pricing" size="lg" className="border-white/25 bg-white/10 text-white hover:bg-white/20">
                View pricing
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Badge tone="blue">Problem</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
              Product-level customs work is still trapped in email, spreadsheets, and brittle lookups.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Classification uncertainty", "Missing documents", "Late landed-cost surprises"].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-white p-5 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-blue-700" />
                <p className="mt-4 text-sm font-medium text-slate-900">{item}</p>
                <p className="mt-2 text-sm text-slate-600">
                  TariffOS turns each shipment into a structured operating plan with evidence, actions, and review gates.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Badge tone="blue">How it works</Badge>
          <div className="mt-6 grid gap-6 lg:grid-cols-4">
            {workflow.map((item, index) => (
              <div key={item} className="rounded-lg border border-border bg-white p-5 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-sm font-semibold text-blue-700">
                  {index + 1}
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-950">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="customers" className="border-y border-border bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <Badge tone="blue">Who it is for</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
              Built first for repeat-SKU trade between the EU, UK, Turkey, and US.
            </h2>
          </div>
          <div className="grid gap-3">
            {customerTypes.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-border bg-white p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-slate-800">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Badge tone="blue">Example output</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
              Shipment execution plans, not chatbot transcripts.
            </h2>
            <p className="mt-4 text-slate-600">
              Every result includes candidate codes, confidence, missing information, required documents, warnings, next actions, compliance gates, and cost-reduction levers.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-slate-950 p-5 text-white shadow-soft">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase text-slate-400">Shipment readiness</p>
                <p className="mt-1 text-2xl font-semibold">82%</p>
              </div>
              <Badge tone="green">ready with review</Badge>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {["Confirm HS code", "Collect origin proof", "Compare freight quotes"].map((item) => (
                <div key={item} className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  <FileText className="mb-3 h-4 w-4 text-blue-300" />
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-300">
              Agent plan for a cotton t-shirt shipment: use 6109.10 as the working classification, collect the invoice and origin evidence, validate value basis, and benchmark carrier options before booking.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          <div>
            <Badge tone="blue">Pricing preview</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">Start narrow, scale to API volume.</h2>
          </div>
          {["Free", "Starter", "Growth"].map((plan) => (
            <div key={plan} className="rounded-lg border border-border bg-white p-5 shadow-sm">
              <Sparkles className="h-5 w-5 text-blue-700" />
              <p className="mt-4 text-lg font-semibold text-slate-950">{plan}</p>
              <p className="mt-2 text-sm text-slate-600">
                Shipment plans, exports, and API access scale by plan.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          Compliance disclaimer: TariffOS outputs are recommendations generated from available product information and tariff data. They are not legal advice. Final classification, duty treatment, and customs declarations should be confirmed by a qualified customs broker or customs authority.
        </div>
      </section>
    </main>
  );
}
