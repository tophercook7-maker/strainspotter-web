-- SUPABASE STORAGE
-- Create a PRIVATE bucket for vault reference images (e.g. AI-Hero-Images from TheVault)

insert into storage.buckets (id, name, public)
values ('vault-reference-images', 'vault-reference-images', false)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;
