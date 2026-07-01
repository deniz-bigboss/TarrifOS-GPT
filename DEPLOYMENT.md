# TariffOS Deployment

This repo is ready for a free-first deployment with Supabase + Vercel.

## Required Accounts

- GitHub repo: `deniz-bigboss/TarrifOS-GPT`
- Supabase project
- Vercel project connected to the GitHub repo

## Supabase

Create a Supabase project, then collect:

- Project ref
- Database password
- Project URL
- Anon public key
- Service role key
- Supabase access token

Apply the database migration:

```powershell
$env:SUPABASE_ACCESS_TOKEN="..."
npx --yes supabase link --project-ref "..." --password "..."
npx --yes supabase db push --linked --password "..."
```

The app falls back to local seed tariff data if the `tariff_codes` table is empty.

## Vercel

Create a Vercel token, then deploy:

```powershell
$env:VERCEL_TOKEN="..."
npx --yes vercel deploy --prod --yes --token "$env:VERCEL_TOKEN"
```

Set these Vercel environment variables for Production, Preview, and Development:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
AI_PROVIDER=mock
```

Optional paid/upgrade variables:

```text
OPENAI_API_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_POSTHOG_KEY
POSTHOG_HOST
SENTRY_DSN
RESEND_API_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

## Supabase Auth URLs

After Vercel deploys, set the Supabase Auth Site URL to the production Vercel URL.

Add redirect URLs:

```text
https://your-vercel-domain.vercel.app/**
http://localhost:3000/**
```

## Current Free-First Mode

Use `AI_PROVIDER=mock` for launch. This avoids OpenAI/Anthropic spend while the product is validated.
