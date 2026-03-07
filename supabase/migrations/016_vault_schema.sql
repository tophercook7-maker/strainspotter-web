-- VAULT SCHEMA (Supabase / Postgres)
-- Run this in Supabase SQL Editor
-- Ingest source: /Volumes/TheVault (full_strains_35000.txt, AI-Hero-Images/)

-- 1) Canonical strain table (35,549 rows from full_strains_35000.txt)
create table if not exists vault_strains (
  strain_id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

create index if not exists idx_vault_strains_slug on vault_strains(slug);


-- 2) Reference image mapping table
create table if not exists vault_strain_images (
  image_id uuid primary key default gen_random_uuid(),
  strain_id uuid not null references vault_strains(strain_id) on delete cascade,
  storage_path text not null,
  curation_level text not null check (curation_level in ('hero','curated','external')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz default now()
);

create index if not exists idx_vault_images_strain_id on vault_strain_images(strain_id);


-- 3) (Planned, not yet used) Image embeddings table
-- Enable later when ready for pgvector
-- create extension if not exists vector;

-- create table vault_image_embeddings (
--   image_id uuid references vault_strain_images(image_id) on delete cascade,
--   embedding vector(768),
--   model_version text,
--   created_at timestamptz default now()
-- );
