-- 022_dispensary_menus.sql
--
-- In-app dispensary menus — the data moat play. Dispensaries with a business
-- profile publish what they carry; items are resolved to the 10k strain
-- catalog by slug at write time, which unlocks the reverse lookup no
-- competitor has: scan a strain → "carried by N dispensaries on StrainSpotter".
--
-- Service-role only (RLS enabled, no public policies): writes flow through
-- /api/b2b/menu (dispensary-owner checks in code), reads through
-- /api/menu/where-to-find (directory-opted-in dispensaries only).

create table if not exists public.dispensary_menu_items (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.business_profiles (id) on delete cascade,
  strain_name  text not null check (char_length(strain_name) between 1 and 120),
  -- Resolved catalog link (null when the name doesn't match the 10k catalog —
  -- still shown on the dispensary's own menu, just not reverse-searchable).
  strain_slug  text,
  category     text not null default 'flower'
               check (category in ('flower','preroll','vape','edible','concentrate','other')),
  price        text check (price is null or char_length(price) <= 40),
  thc          text check (thc is null or char_length(thc) <= 40),
  in_stock     boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists dispensary_menu_items_profile_idx
  on public.dispensary_menu_items (profile_id);
-- The reverse lookup: which dispensaries carry slug X (in stock)?
create index if not exists dispensary_menu_items_slug_idx
  on public.dispensary_menu_items (strain_slug)
  where strain_slug is not null and in_stock = true;

alter table public.dispensary_menu_items enable row level security;
