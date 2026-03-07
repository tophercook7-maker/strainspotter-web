-- plant_harvests: one record per plant (latest wins via upsert on plant_id)
create table if not exists plant_harvests (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null unique references plants(id) on delete cascade,
  garden_id uuid not null references gardens(id) on delete cascade,
  dry_weight_g numeric not null,
  wet_weight_g numeric null,
  notes text null,
  harvested_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_plant_harvests_garden_harvested_at
  on plant_harvests (garden_id, harvested_at desc);

comment on table plant_harvests is 'One harvest record per plant; upsert on plant_id.';
