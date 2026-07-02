with rows as (
  select *
  from (
    values
      (
        '8712.00',
        'HS',
        'Bicycles and other cycles, not motorized',
        'Complete non-motorized bicycles, including road, racing, mountain, and recreational cycles.',
        '["bicycle", "bike", "cycle", "road bike", "racing bike", "tarmac", "s-works", "specialized", "complete bicycle"]'::jsonb,
        '87',
        'Vehicles, aircraft, vessels and associated transport equipment',
        'Bicycle duty varies by destination, origin, and whether the shipment is complete or parts.',
        '["commercial invoice", "packing list", "certificate of origin", "technical specification"]'::jsonb,
        '["Confirm whether the item is a complete bicycle, electric bicycle, frameset, or spare part before filing."]'::jsonb,
        'medium'
      ),
      (
        '8714.91',
        'HS',
        'Frames and forks, and parts thereof, for bicycles',
        'Bicycle frames, forks, framesets, and related cycle parts shipped separately from a complete bicycle.',
        '["frameset", "frame", "fork", "carbon frame", "carbon fiber", "carbon fibre", "tarmac", "s-works", "specialized", "bicycle part"]'::jsonb,
        '87',
        'Vehicles, aircraft, vessels and associated transport equipment',
        'Bicycle parts duty varies by destination and whether parts are assembled or shipped separately.',
        '["commercial invoice", "packing list", "certificate of origin", "technical specification", "material declaration"]'::jsonb,
        '["Confirm complete-bike versus parts status and whether any electric assist, battery, or motor component is included."]'::jsonb,
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
        '8712.00',
        'HS',
        'Bicycles and other cycles, not motorized',
        'Complete non-motorized bicycles, including road, racing, mountain, and recreational cycles.',
        '["bicycle", "bike", "cycle", "road bike", "racing bike", "tarmac", "s-works", "specialized", "complete bicycle"]'::jsonb,
        '87',
        'Vehicles, aircraft, vessels and associated transport equipment',
        'Bicycle duty varies by destination, origin, and whether the shipment is complete or parts.',
        '["commercial invoice", "packing list", "certificate of origin", "technical specification"]'::jsonb,
        '["Confirm whether the item is a complete bicycle, electric bicycle, frameset, or spare part before filing."]'::jsonb,
        'medium'
      ),
      (
        '8714.91',
        'HS',
        'Frames and forks, and parts thereof, for bicycles',
        'Bicycle frames, forks, framesets, and related cycle parts shipped separately from a complete bicycle.',
        '["frameset", "frame", "fork", "carbon frame", "carbon fiber", "carbon fibre", "tarmac", "s-works", "specialized", "bicycle part"]'::jsonb,
        '87',
        'Vehicles, aircraft, vessels and associated transport equipment',
        'Bicycle parts duty varies by destination and whether parts are assembled or shipped separately.',
        '["commercial invoice", "packing list", "certificate of origin", "technical specification", "material declaration"]'::jsonb,
        '["Confirm complete-bike versus parts status and whether any electric assist, battery, or motor component is included."]'::jsonb,
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
