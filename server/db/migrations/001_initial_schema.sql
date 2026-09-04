-- ==============================================================================
-- THE NGALUNG ATELIER — PRODUCTION POSTGRESQL SCHEMA (MIGRATION 001)
-- ==============================================================================
-- Normalized schema for durable storage of products, orders, payments, customers,
-- refunds, discount codes, webhook idempotency, analytics, and store settings.
-- ==============================================================================

-- 1. Customers Table (User Authentication & Accounts)
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers (created_at DESC);

-- 2. Products Table (Catalog & Digital Vault Metadata)
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category VARCHAR(64) NOT NULL,
  price_inr INTEGER NOT NULL CHECK (price_inr >= 0),
  price_usd INTEGER NOT NULL CHECK (price_usd >= 0),
  original_price_inr INTEGER NOT NULL DEFAULT 0,
  original_price_usd INTEGER NOT NULL DEFAULT 0,
  cover_image TEXT NOT NULL,
  preview_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  testimonials JSONB NOT NULL DEFAULT '[]'::jsonb,
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  digital_asset JSONB NOT NULL DEFAULT '{}'::jsonb,
  badge VARCHAR(64) DEFAULT 'NEW',
  status VARCHAR(32) NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
  is_published BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  total_sales_count INTEGER NOT NULL DEFAULT 0 CHECK (total_sales_count >= 0),
  rating_average NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_status_published ON products (status, is_published);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- 3. Discount Codes Table
CREATE TABLE IF NOT EXISTS discount_codes (
  code VARCHAR(64) PRIMARY KEY,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Orders Table (Transactional Purchase & Fulfillment Ledger)
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(64) NOT NULL UNIQUE,
  customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE RESTRICT,
  product_slug VARCHAR(255) NOT NULL,
  product_title VARCHAR(255) NOT NULL,
  product_cover TEXT NOT NULL DEFAULT '',
  product_category VARCHAR(64) NOT NULL DEFAULT 'Template',
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_phone VARCHAR(64) DEFAULT '',
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  discount_code VARCHAR(64),
  discount_amount INTEGER DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
  access_token VARCHAR(128) NOT NULL UNIQUE,
  razorpay_order_id VARCHAR(128),
  razorpay_payment_id VARCHAR(128),
  razorpay_signature TEXT,
  gateway_payment_id VARCHAR(128),
  payment_method VARCHAR(64) NOT NULL DEFAULT 'RAZORPAY',
  utr_number VARCHAR(128),
  utm_source VARCHAR(128) DEFAULT 'direct',
  refund_amount INTEGER DEFAULT 0,
  refund_currency VARCHAR(3) DEFAULT 'INR',
  refund_status VARCHAR(32),
  refund_created_at TIMESTAMPTZ,
  refund_processed_at TIMESTAMPTZ,
  razorpay_refund_id VARCHAR(128),
  refund_reason TEXT,
  refund_notes JSONB,
  fulfillment_email_sent BOOLEAN NOT NULL DEFAULT false,
  email_delivery_status VARCHAR(32) DEFAULT 'pending',
  confirmation_email_sent_at TIMESTAMPTZ,
  email_delivery_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_email ON orders (LOWER(buyer_email));
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_access_token ON orders (access_token);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_razorpay_order_id ON orders (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_razorpay_payment_id ON orders (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- 5. Payments Table (Authoritative Gateway Capture Ledger)
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  razorpay_order_id VARCHAR(128) NOT NULL,
  razorpay_payment_id VARCHAR(128) NOT NULL UNIQUE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(32) NOT NULL DEFAULT 'captured',
  payment_method VARCHAR(64) DEFAULT 'RAZORPAY',
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC);

-- 6. Refunds Table (Gateway Refund Ledger)
CREATE TABLE IF NOT EXISTS refunds (
  id VARCHAR(128) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  razorpay_payment_id VARCHAR(128) NOT NULL,
  razorpay_refund_id VARCHAR(128) NOT NULL UNIQUE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(32) NOT NULL DEFAULT 'processed',
  reason TEXT,
  notes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds (order_id);

-- 7. Webhook Events Table (Durable Idempotency & Replay Protection)
CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(128) PRIMARY KEY,
  event VARCHAR(128) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  order_id VARCHAR(128),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events (received_at DESC);

-- 8. Analytics Events Table (Visitor & Traffic Tracking)
CREATE TABLE IF NOT EXISTS analytics_events (
  id VARCHAR(64) PRIMARY KEY,
  visitor_id VARCHAR(128),
  product_id VARCHAR(64),
  product_slug VARCHAR(255),
  type VARCHAR(64) NOT NULL,
  source VARCHAR(128) NOT NULL DEFAULT 'direct',
  path VARCHAR(255) NOT NULL DEFAULT '/',
  amount NUMERIC(12, 2) DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product_id ON analytics_events (product_id);

-- 9. Contact Submissions Table (Inquiry Archival)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Store Settings Table (Single-Row Configuration Record)
CREATE TABLE IF NOT EXISTS store_settings (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
  store_name VARCHAR(255) NOT NULL DEFAULT 'The Ngalung Atelier',
  store_tagline TEXT NOT NULL DEFAULT '',
  creator_name VARCHAR(255) NOT NULL DEFAULT 'The Ngalung Atelier',
  creator_bio TEXT NOT NULL DEFAULT '',
  creator_avatar TEXT NOT NULL DEFAULT '',
  support_email VARCHAR(255) NOT NULL DEFAULT 'support@ngalungatelier.com',
  business_name VARCHAR(255) NOT NULL DEFAULT 'The Ngalung Atelier',
  country VARCHAR(64) NOT NULL DEFAULT 'India',
  refund_policy_summary TEXT,
  refund_policy_text TEXT,
  terms_custom_text TEXT,
  privacy_custom_text TEXT,
  upi_id VARCHAR(128) NOT NULL DEFAULT 'ngalung.atelier@upi',
  merchant_name VARCHAR(255) NOT NULL DEFAULT 'The Ngalung Atelier',
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  test_mode BOOLEAN NOT NULL DEFAULT true,
  razorpay_key_id VARCHAR(128) NOT NULL DEFAULT '',
  razorpay_key_secret VARCHAR(128) NOT NULL DEFAULT '',
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  discount_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
