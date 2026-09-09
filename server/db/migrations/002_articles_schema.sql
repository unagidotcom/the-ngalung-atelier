-- ==============================================================================
-- THE NGALUNG ATELIER - ARTICLES / BLOG SYSTEM (MIGRATION 002)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS articles (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  author VARCHAR(255) NOT NULL DEFAULT 'Ng Kharinghor',
  category VARCHAR(128) NOT NULL DEFAULT 'Digital Business',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured_image TEXT NOT NULL DEFAULT '',
  featured_image_alt TEXT NOT NULL DEFAULT '',
  primary_keyword VARCHAR(255) NOT NULL DEFAULT '',
  secondary_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title VARCHAR(255) NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  canonical_url TEXT,
  og_title VARCHAR(255) NOT NULL DEFAULT '',
  og_description TEXT NOT NULL DEFAULT '',
  og_image TEXT NOT NULL DEFAULT '',
  social_share_title VARCHAR(255),
  social_share_description TEXT,
  social_share_image TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  book_cta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (category);
CREATE INDEX IF NOT EXISTS idx_articles_updated_at ON articles (updated_at DESC);

ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS article_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS article_slug VARCHAR(255),
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_analytics_events_article_id ON analytics_events (article_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_article_slug ON analytics_events (article_slug);
