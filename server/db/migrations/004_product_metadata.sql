-- Admin-only structured product metadata for category-specific cataloging.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_product_metadata_gin
  ON products USING GIN (product_metadata);
