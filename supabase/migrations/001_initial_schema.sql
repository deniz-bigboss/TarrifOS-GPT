create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.classification_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  product_name text not null,
  product_description text not null,
  material_composition text,
  intended_use text,
  brand text,
  model text,
  sku text,
  category text,
  supplier_country text,
  origin_country text not null,
  destination_country text not null,
  import_or_export text not null default 'import',
  declared_value numeric,
  currency text,
  quantity numeric,
  unit_weight numeric,
  shipping_method text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists public.classification_results (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.classification_requests(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recommended_code text not null,
  recommended_title text not null,
  confidence numeric not null,
  confidence_label text not null,
  reasoning_summary text,
  key_factors jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,
  restriction_warnings jsonb not null default '[]'::jsonb,
  human_review_required boolean not null default true,
  human_review_reason text,
  broker_ready_explanation text,
  duty_rate_placeholder text,
  raw_ai_output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.classification_candidates (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.classification_results(id) on delete cascade,
  code text not null,
  title text not null,
  reason text,
  confidence numeric,
  source text
);

create table if not exists public.tariff_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  jurisdiction text not null,
  title text not null,
  description text not null,
  keywords jsonb not null default '[]'::jsonb,
  chapter text,
  section text,
  duty_rate_placeholder text,
  required_documents jsonb not null default '[]'::jsonb,
  restriction_notes jsonb not null default '[]'::jsonb,
  risk_level text not null default 'low',
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid not null references public.classification_requests(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size_bytes integer,
  storage_path text,
  extracted_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete set null,
  event_type text not null,
  quantity integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid references public.classification_requests(id) on delete set null,
  provider text not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  estimated_cost_usd numeric,
  success boolean not null,
  error_message text,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_labels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  classification_result_id uuid not null references public.classification_results(id) on delete cascade,
  actual_code text,
  was_correct boolean,
  broker_notes text,
  shipment_cleared boolean,
  delay_occurred boolean,
  penalty_occurred boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text,
  status text,
  created_at timestamptz not null default now()
);

create index if not exists classification_requests_org_created_idx
  on public.classification_requests(organization_id, created_at desc);

create index if not exists classification_results_org_created_idx
  on public.classification_results(organization_id, created_at desc);

create index if not exists classification_candidates_result_idx
  on public.classification_candidates(result_id);

create index if not exists tariff_codes_search_idx
  on public.tariff_codes using gin (to_tsvector('english', title || ' ' || description));

create index if not exists api_keys_hash_idx
  on public.api_keys(key_hash);

create index if not exists ai_usage_events_org_created_idx
  on public.ai_usage_events(organization_id, created_at desc);

create or replace function public.current_organization_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from public.profiles where user_id = auth.uid() limit 1;
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.classification_requests enable row level security;
alter table public.classification_results enable row level security;
alter table public.classification_candidates enable row level security;
alter table public.tariff_codes enable row level security;
alter table public.documents enable row level security;
alter table public.api_keys enable row level security;
alter table public.usage_events enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.feedback_labels enable row level security;
alter table public.billing_events enable row level security;

create policy "Users can read their organization"
  on public.organizations for select
  using (id = public.current_organization_id());

create policy "Users can read their profile"
  on public.profiles for select
  using (user_id = auth.uid());

create policy "Users can insert their profile"
  on public.profiles for insert
  with check (user_id = auth.uid());

create policy "Organization members can read requests"
  on public.classification_requests for select
  using (organization_id = public.current_organization_id());

create policy "Organization members can insert requests"
  on public.classification_requests for insert
  with check (organization_id = public.current_organization_id());

create policy "Organization members can read results"
  on public.classification_results for select
  using (organization_id = public.current_organization_id());

create policy "Organization members can read candidates"
  on public.classification_candidates for select
  using (
    exists (
      select 1 from public.classification_results r
      where r.id = result_id and r.organization_id = public.current_organization_id()
    )
  );

create policy "Tariff codes are readable by authenticated users"
  on public.tariff_codes for select
  to authenticated
  using (true);

create policy "Organization members can manage documents"
  on public.documents for all
  using (organization_id = public.current_organization_id())
  with check (organization_id = public.current_organization_id());

create policy "Organization members can read API keys"
  on public.api_keys for select
  using (organization_id = public.current_organization_id());

create policy "Organization members can read usage"
  on public.usage_events for select
  using (organization_id = public.current_organization_id());

create policy "Organization members can read AI usage"
  on public.ai_usage_events for select
  using (organization_id = public.current_organization_id());

create policy "Organization members can manage feedback"
  on public.feedback_labels for all
  using (organization_id = public.current_organization_id())
  with check (organization_id = public.current_organization_id());

create policy "Organization members can read billing"
  on public.billing_events for select
  using (organization_id = public.current_organization_id());
