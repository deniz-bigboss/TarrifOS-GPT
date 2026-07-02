with rows as (
  select *
  from (
    values
      (
        '9102.12',
        'HS',
        'Wrist-watches, electrically operated, with opto-electronic display only',
        'Battery-powered digital wristwatches with LCD or other opto-electronic displays, including quartz digital watches.',
        '["watch", "wristwatch", "digital watch", "quartz", "lcd", "timepiece", "casio", "f-91w", "g-shock", "battery powered"]'::jsonb,
        '91',
        'Clocks and watches and parts thereof',
        'Watch duty varies by destination, display type, case material, movement, and battery status.',
        '["commercial invoice", "packing list", "certificate of origin", "technical specification", "battery declaration"]'::jsonb,
        '["Confirm battery type, whether batteries are installed, and any carrier documentation needed for battery-containing products."]'::jsonb,
        'medium'
      ),
      (
        '9102.11',
        'HS',
        'Wrist-watches, electrically operated, with mechanical display only',
        'Battery-powered wristwatches with mechanical/analog display only.',
        '["watch", "wristwatch", "analog watch", "quartz", "timepiece", "battery powered", "mechanical display"]'::jsonb,
        '91',
        'Clocks and watches and parts thereof',
        'Watch duty varies by destination, movement, display, case material, and battery status.',
        '["commercial invoice", "packing list", "certificate of origin", "technical specification", "battery declaration"]'::jsonb,
        '["Confirm display type, movement, case material, and installed battery status before filing."]'::jsonb,
        'medium'
      )
  ) as seed(
    code,
    jurisdiction,
    title,
    description,
    keywords,
    chapter,
    section,
    duty_rate_placeholder,
    required_documents,
    restriction_notes,
    risk_level
  )
)
update public.tariff_codes target
set
  jurisdiction = rows.jurisdiction,
  title = rows.title,
  description = rows.description,
  keywords = rows.keywords,
  chapter = rows.chapter,
  section = rows.section,
  duty_rate_placeholder = rows.duty_rate_placeholder,
  required_documents = rows.required_documents,
  restriction_notes = rows.restriction_notes,
  risk_level = rows.risk_level
from rows
where target.code = rows.code;

with rows as (
  select *
  from (
    values
      (
        '9102.12',
        'HS',
        'Wrist-watches, electrically operated, with opto-electronic display only',
        'Battery-powered digital wristwatches with LCD or other opto-electronic displays, including quartz digital watches.',
        '["watch", "wristwatch", "digital watch", "quartz", "lcd", "timepiece", "casio", "f-91w", "g-shock", "battery powered"]'::jsonb,
        '91',
        'Clocks and watches and parts thereof',
        'Watch duty varies by destination, display type, case material, movement, and battery status.',
        '["commercial invoice", "packing list", "certificate of origin", "technical specification", "battery declaration"]'::jsonb,
        '["Confirm battery type, whether batteries are installed, and any carrier documentation needed for battery-containing products."]'::jsonb,
        'medium'
      ),
      (
        '9102.11',
        'HS',
        'Wrist-watches, electrically operated, with mechanical display only',
        'Battery-powered wristwatches with mechanical/analog display only.',
        '["watch", "wristwatch", "analog watch", "quartz", "timepiece", "battery powered", "mechanical display"]'::jsonb,
        '91',
        'Clocks and watches and parts thereof',
        'Watch duty varies by destination, movement, display, case material, and battery status.',
        '["commercial invoice", "packing list", "certificate of origin", "technical specification", "battery declaration"]'::jsonb,
        '["Confirm display type, movement, case material, and installed battery status before filing."]'::jsonb,
        'medium'
      )
  ) as seed(
    code,
    jurisdiction,
    title,
    description,
    keywords,
    chapter,
    section,
    duty_rate_placeholder,
    required_documents,
    restriction_notes,
    risk_level
  )
)
insert into public.tariff_codes (
  code,
  jurisdiction,
  title,
  description,
  keywords,
  chapter,
  section,
  duty_rate_placeholder,
  required_documents,
  restriction_notes,
  risk_level
)
select
  rows.code,
  rows.jurisdiction,
  rows.title,
  rows.description,
  rows.keywords,
  rows.chapter,
  rows.section,
  rows.duty_rate_placeholder,
  rows.required_documents,
  rows.restriction_notes,
  rows.risk_level
from rows
where not exists (
  select 1
  from public.tariff_codes existing
  where existing.code = rows.code
);
