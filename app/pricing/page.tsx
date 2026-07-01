import { ArrowRight, Check } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    features: ["10 classifications/month", "manual entry only", "no API", "basic export"]
  },
  {
    name: "Starter",
    price: "$99/month",
    features: ["100 classifications/month", "classification history", "export reports", "basic support"]
  },
  {
    name: "Growth",
    price: "$499/month",
    features: ["1,000 classifications/month", "API access", "document uploads", "team workspace", "feedback loop"]
  },
  {
    name: "Forwarder",
    price: "$1,500/month starting",
    features: ["5,000+ classifications/month", "API access", "custom workflows", "priority review queue", "onboarding support"]
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: ["custom tariff-data adapters", "SSO", "audit logs", "SLA", "dedicated support"]
  }
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="relative bg-slate-950">
        <SiteNav />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
          <Badge className="border-white/20 bg-white/10 text-white">Pricing</Badge>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-normal text-white sm:text-5xl">
            Plans for manual pre-classification, repeat-SKU teams, and API volume.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Stripe is wired as a placeholder in the MVP. Upgrade actions can be connected once billing keys are available.
          </p>
        </div>
      </div>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-5">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-lg border border-border bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-blue-700">{plan.name}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{plan.price}</p>
              <ul className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {feature}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/dashboard" className="mt-6 w-full" variant={plan.name === "Growth" ? "primary" : "outline"}>
                Mock upgrade
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-lg border border-border bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Usage-based API pricing placeholder</p>
          <p className="mt-2 text-sm text-slate-600">
            $0.20-$2.00 per classification depending on volume, enrichment level, and tariff-data adapter coverage.
          </p>
        </div>
      </section>
    </main>
  );
}
