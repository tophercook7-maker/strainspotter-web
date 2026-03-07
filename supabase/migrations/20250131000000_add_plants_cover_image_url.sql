-- Add optional cover image URL to plants (e.g. scan image data URL when creating from scanner)
ALTER TABLE plants ADD COLUMN IF NOT EXISTS cover_image_url text NULL;
