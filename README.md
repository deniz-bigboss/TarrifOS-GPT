# TariffOS

TariffOS is a production-oriented MVP for AI-native customs/tariff classification and landed-cost recommendation workflows. It is built as a structured SaaS + API product, not a generic chatbot.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS with local shadcn-style primitives
- Supabase Auth + Postgres adapter
- Zod validation
- React Hook Form
- TanStack Table
- OpenAI/Anthropic provider abstraction with a mock provider fallback

## Local Setup

This machine needs Node.js 18.17+ and npm/pnpm/yarn available on PATH.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app runs in mock mode by default:

- mock auth works from `/auth/signup` and `/auth/login`
- one demo organization is created automatically
- seed tariff data is loaded locally
- AI reasoning uses `MockAIProvider`
- demo API key: `tariffos_test_key_demo`

Real AI calls cost money. Use `AI_PROVIDER=mock` during development and only set OpenAI or Anthropic keys when you are ready to pay for live model calls.

## Environment Variables

Copy `.env.example` to `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=mock
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
POSTHOG_HOST=
SENTRY_DSN=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Use `AI_PROVIDER=mock`, `openai`, or `anthropic`. If `AI_PROVIDER=openai` is selected without `OPENAI_API_KEY`, or `AI_PROVIDER=anthropic` is selected without `ANTHROPIC_API_KEY`, TariffOS throws a clear setup error. Missing optional services such as PostHog, Sentry, Resend, Stripe, and Upstash do not break the MVP.

## Running TariffOS for Free

TariffOS is designed for a zero-burn founder workflow:

1. Create a free Supabase project.
2. Copy the Supabase URL and anon key into `.env.local`.
3. Add `SUPABASE_SERVICE_ROLE_KEY` for server-side database operations.
4. Run `supabase/migrations/001_initial_schema.sql`.
5. Seed tariff codes into `tariff_codes`, or rely on the local seed fallback in `lib/tariff-data/seed-data.ts`.
6. Set `AI_PROVIDER=mock`.
7. Deploy to the Vercel free tier.
8. Do not add OpenAI or Anthropic keys until you are ready for paid AI usage.
9. Optional: add PostHog, Sentry, Resend, Stripe, or Upstash later when the feature needs it.
10. Free tiers have limits and may change; the app is built so missing optional services disable only that feature.

The MVP uses free-first defaults:

- Mock AI by default
- local/Supabase seed tariff data
- database-backed usage limits
- Supabase Storage provider with mock fallback
- optional PostHog analytics
- optional Sentry placeholder
- optional Resend email provider
- optional Stripe billing placeholders
- no paid vector database, OCR API, queue, or tariff-data API

## When to Upgrade

Upgrade infrastructure only when real usage justifies it:

- users hit Supabase database or storage limits
- real AI usage is required for paying workflows
- API customers need higher rate limits
- document extraction becomes important enough for OCR
- teams need billing automation through Stripe
- paying customers require stronger reliability or observability

Until then, keep classification synchronous, prompts short, usage logged, and external services optional.

## Supabase

Apply the migration:

```bash
supabase db push
```

or paste `supabase/migrations/001_initial_schema.sql` into the Supabase SQL editor.

The first authenticated user gets one organization automatically through `ensureSupabaseWorkspaceForUser()`. Server-side persistence uses `SUPABASE_SERVICE_ROLE_KEY`.

The MVP tariff data is local in `lib/tariff-data/seed-data.ts`. See `seed/README.md` for the Postgres import mapping.

`SeedTariffDataProvider` reads from the Supabase `tariff_codes` table when Supabase service credentials exist. If no rows or service credentials are available, it falls back to local seed data.

## Classification Flow

Pipeline stages live in `lib/classification/pipeline.ts`:

1. `normalizeProductInput()`
2. `retrieveCandidateCodes()`
3. `generateClassificationReasoning()`
4. `validateClassification()`
5. `calculateConfidence()`
6. `generateBrokerReadyReport()`
7. `saveClassification()` through the repository adapter

High-risk categories and confidence below `0.75` automatically require human review.

## API

Create an API key at `/dashboard/api-keys` or use the mock key locally.

```bash
curl -X POST http://localhost:3000/api/v1/classify \
  -H "Authorization: Bearer tariffos_test_key_demo" \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Men'\''s cotton t-shirt",
    "product_description": "100% cotton knitted short-sleeve t-shirt",
    "material_composition": "100% cotton",
    "intended_use": "apparel",
    "origin_country": "TR",
    "destination_country": "DE",
    "declared_value": 1200,
    "currency": "EUR"
  }'
```

Other endpoints:

- `GET /api/v1/classifications/:id`
- `POST /api/v1/classifications/:id/feedback`

Feedback labels save broker/customs outcomes and form the learning loop.

Free-plan API access is disabled for real organizations. The local mock demo key is kept available so development and API testing work without paid services.

## Cost Guardrails

- Free: 10 classifications/month, 3 documents/classification, 5 MB/document, no real API access.
- Starter: 100 classifications/month, 5 documents/classification, 10 MB/document.
- Growth: 1,000 classifications/month with API access.
- Forwarder and Enterprise plans support larger/custom limits.

Real AI calls are logged to `ai_usage_events` with provider, model, token estimates, latency, success/failure, and estimated cost. Repeated identical product requests are served from the classification cache before another AI call is made.

## Provider Abstractions

Free-first upgrade seams live in `lib/`:

- `AIProvider`: mock, OpenAI, Anthropic
- `TariffDataProvider`: seed provider plus future official/paid placeholders
- `CandidateSearchProvider`: keyword now, vector later
- `StorageProvider`: Supabase Storage or mock
- `DocumentExtractionProvider`: mock/basic placeholder now, OCR later
- `RateLimitProvider`: database now, Upstash later
- `EmailProvider`: mock now, Resend optional
- `AnalyticsProvider`: no-op now, PostHog optional

## Safety

Every result includes the compliance disclaimer:

> This output is a recommendation generated from available product information and tariff data. It is not legal advice. Final classification, duty treatment, and customs declarations should be confirmed by a qualified customs broker or customs authority.

TariffOS never claims a classification is guaranteed correct.
