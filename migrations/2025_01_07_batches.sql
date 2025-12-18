-- BATCHES TABLE

create table if not exists batches (

  id uuid primary key default gen_random_uuid(),

  owner_id uuid references profiles(id) on delete cascade,

  strain text not null,

  batch_code text unique not null,

  harvested_at date,

  cured_at date,

  expires_at date,

  total_units int not null default 0,

  remaining_units int not null default 0,

  thc numeric,

  cbd numeric,

  terpenes jsonb,

  coa_url text, -- lab certificate

  notes text,

  created_at timestamp default now(),

  updated_at timestamp default now()

);



-- BATCH EVENTS (audit log)

create table if not exists batch_events (

  id uuid primary key default gen_random_uuid(),

  batch_id uuid references batches(id) on delete cascade,

  event_type text not null,

  event_data jsonb,

  created_at timestamp default now()

);



-- MODIFY INVENTORY TO LINK TO BATCHES

alter table grower_inventory

add column if not exists batch_id uuid references batches(id);



-- Indexes for performance

create index if not exists idx_batches_owner_id on batches(owner_id);

create index if not exists idx_batches_batch_code on batches(batch_code);

create index if not exists idx_batch_events_batch_id on batch_events(batch_id);

create index if not exists idx_grower_inventory_batch_id on grower_inventory(batch_id) where batch_id is not null;



-- Function to update updated_at timestamp for batches

create or replace function update_batches_updated_at()

returns trigger as $$

begin

  new.updated_at = now();

  return new;

end;

$$ language plpgsql;



-- Trigger to automatically update updated_at for batches

create trigger update_batches_timestamp

  before update on batches

  for each row

  execute function update_batches_updated_at();
