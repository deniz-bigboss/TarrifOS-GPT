# TariffOS Seed Data

The MVP ships with 60 local HS-style seed records in `lib/tariff-data/seed-data.ts`.

That seed data powers `SeedTariffDataProvider`, so the app runs without live government tariff APIs. The `tariff_codes` Supabase table is included for the next adapter step. To seed Postgres, copy the records from `lib/tariff-data/seed-data.ts` into the `tariff_codes` table or add an import script that maps:

- `dutyRatePlaceholder` -> `duty_rate_placeholder`
- `requiredDocuments` -> `required_documents`
- `restrictionNotes` -> `restriction_notes`
- `riskLevel` -> `risk_level`

Official-source adapters should be added behind the `TariffDataProvider` interface rather than replacing the local seed provider.
