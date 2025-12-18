-- Grower Inventory Table

create table if not exists grower_inventory (

  id uuid primary key default uuid_generate_v4(),

  grower_id uuid references profiles(user_id) on delete cascade,

  name text not null,

  strain_slug text,

  category text,               -- flower, pre-roll, edible, concentrate, clone, seed

  batch_number text,

  barcode text,

  thc numeric,

  cbd numeric,

  weight_grams numeric,

  units_available int,

  price numeric,

  images text[] default '{}',

  status text default 'active', -- active, low, sold_out, archived

  created_at timestamptz default now(),

  updated_at timestamptz default now(),

  constraint status_check check (status in ('active', 'low', 'sold_out', 'archived'))

);

-- Indexes for performance

create index if not exists idx_grower_inventory_grower_id on grower_inventory(grower_id);

create index if not exists idx_grower_inventory_status on grower_inventory(status);

create index if not exists idx_grower_inventory_category on grower_inventory(category);

create index if not exists idx_grower_inventory_barcode on grower_inventory(barcode) where barcode is not null;

-- Function to update updated_at timestamp

create or replace function update_grower_inventory_updated_at()

returns trigger as $$

begin

  new.updated_at = now();

  return new;

end;

$$ language plpgsql;

-- Trigger to automatically update updated_at

create trigger update_grower_inventory_timestamp

  before update on grower_inventory

  for each row

  execute function update_grower_inventory_updated_at();
