-- Public bucket for strain reference candidate images (fallback path uploads).
-- Service role can upload; public read for durable URLs.

INSERT INTO storage.buckets (id, name, public)
VALUES ('strain-reference-images', 'strain-reference-images', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;
