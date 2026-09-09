-- ==============================================================================
-- THE NGALUNG ATELIER - PAID CUSTOMER ARTICLE AUTHORING WORKFLOW (MIGRATION 003)
-- ==============================================================================

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS owner_customer_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS owner_customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS owner_customer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(64) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS review_feedback TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entitlement_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_articles_owner_customer_id ON articles (owner_customer_id);
CREATE INDEX IF NOT EXISTS idx_articles_review_status ON articles (review_status);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles (source);

CREATE TABLE IF NOT EXISTS article_submission_entitlements (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'used', 'revoked', 'refunded')),
  order_reference VARCHAR(128),
  razorpay_order_id VARCHAR(128) UNIQUE,
  razorpay_payment_id VARCHAR(128) UNIQUE,
  amount_inr INTEGER NOT NULL CHECK (amount_inr >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  article_id VARCHAR(64) REFERENCES articles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_article_entitlements_customer_id ON article_submission_entitlements (customer_id);
CREATE INDEX IF NOT EXISTS idx_article_entitlements_status ON article_submission_entitlements (status);
CREATE INDEX IF NOT EXISTS idx_article_entitlements_order_id ON article_submission_entitlements (razorpay_order_id);

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS article_submission JSONB NOT NULL DEFAULT '{"enabled": true, "priceINR": 999, "currency": "INR", "guidelines": "Submit original, useful, non-spam articles for editorial review. Publication is not guaranteed and customers cannot publish directly."}'::jsonb;
