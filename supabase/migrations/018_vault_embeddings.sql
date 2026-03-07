-- Enable pgvector and create vault_image_embeddings (for hero image backfill)
-- Run in Supabase SQL Editor after 016 and 017

create extension if not exists vector;

create table if not exists vault_image_embeddings (
  image_id uuid not null references vault_strain_images(image_id) on delete cascade,
  embedding vector(1536) not null,
  model_version text not null default 'text-embedding-3-small',
  created_at timestamptz default now(),
  primary key (image_id)
);

-- Skip vector index if pgvector operator classes unavailable (older Supabase pgvector)
do $$
begin
  create index if not exists idx_vault_embeddings_vector on vault_image_embeddings
    using hnsw (embedding vector_l2_ops);
exception
  when others then
    raise notice 'Skipping vector index (pgvector operator class not available): %', sqlerrm;
end $$;
