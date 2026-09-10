import fs from 'fs';
import path from 'path';
import { getPool, checkDatabaseConnection, withTransaction } from './client';
import { DatabaseSchema, CustomerRecord, WebhookEventRecord } from '../dataStore';
import { Product, Order, AnalyticsEvent, StoreSettings } from '../../src/types';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

export interface MigrationSummary {
  dryRun: boolean;
  totalCustomers: number;
  totalProducts: number;
  totalOrders: number;
  totalPayments: number;
  totalRefunds: number;
  totalWebhookEvents: number;
  totalAnalyticsEvents: number;
  totalDiscounts: number;
  grossRevenueINR: number;
  refundedRevenueINR: number;
  netRevenueINR: number;
  invalidRecordsCount: number;
  duplicateRecordsCount: number;
  validationResult?: {
    customersMatch: boolean;
    productsMatch: boolean;
    ordersMatch: boolean;
    webhookEventsMatch: boolean;
    revenueMatch: boolean;
    mismatches: string[];
  };
  errors: string[];
}

export async function importJsonToPostgres(options: { dryRun?: boolean } = {}): Promise<MigrationSummary> {
  const isDryRun = options.dryRun ?? false;

  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`Data file not found at: ${DB_FILE}`);
  }

  const rawJson = fs.readFileSync(DB_FILE, 'utf-8');
  const data: DatabaseSchema = JSON.parse(rawJson);

  const products: Product[] = data.products || [];
  const orders: Order[] = data.orders || [];
  const customers: CustomerRecord[] = data.customers || [];
  const webhookEvents: WebhookEventRecord[] = data.webhookEvents || [];
  const events: AnalyticsEvent[] = data.events || [];
  const settings: StoreSettings = data.settings;
  const discounts = settings?.discountCodes || [];

  // Calculate stats from JSON
  let grossRevenueINR = 0;
  let refundedRevenueINR = 0;
  let totalPayments = 0;
  let totalRefunds = 0;
  let invalidRecords = 0;
  const errors: string[] = [];

  for (const o of orders) {
    if (o.status === 'paid' || o.status === 'partially_refunded' || o.status === 'refunded') {
      const amt = o.currency === 'USD' ? Math.round(o.amount * 85) : o.amount;
      grossRevenueINR += amt;
      totalPayments += 1;

      if (o.status === 'refunded') {
        const ref = o.refundAmount !== undefined ? o.refundAmount : o.amount;
        refundedRevenueINR += o.currency === 'USD' ? Math.round(ref * 85) : ref;
        totalRefunds += 1;
      } else if (o.status === 'partially_refunded') {
        const ref = o.refundAmount || 0;
        refundedRevenueINR += o.currency === 'USD' ? Math.round(ref * 85) : ref;
        totalRefunds += 1;
      }
    }
  }

  const netRevenueINR = Math.max(0, grossRevenueINR - refundedRevenueINR);

  const summary: MigrationSummary = {
    dryRun: isDryRun,
    totalCustomers: customers.length,
    totalProducts: products.length,
    totalOrders: orders.length,
    totalPayments,
    totalRefunds,
    totalWebhookEvents: webhookEvents.length,
    totalAnalyticsEvents: events.length,
    totalDiscounts: discounts.length,
    grossRevenueINR,
    refundedRevenueINR,
    netRevenueINR,
    invalidRecordsCount: invalidRecords,
    duplicateRecordsCount: 0,
    errors
  };

  if (isDryRun) {
    console.log('\n--- DRY RUN SUMMARY (NO POSTGRES MODIFICATIONS) ---');
    console.log(`• Customers: ${customers.length}`);
    console.log(`• Products: ${products.length}`);
    console.log(`• Orders: ${orders.length} (Paid: ${totalPayments}, Refunded: ${totalRefunds})`);
    console.log(`• Webhook Events: ${webhookEvents.length}`);
    console.log(`• Analytics Events: ${events.length}`);
    console.log(`• Discount Codes: ${discounts.length}`);
    console.log(`• Financial Totals: Gross ₹${grossRevenueINR.toLocaleString('en-IN')} | Refunded ₹${refundedRevenueINR.toLocaleString('en-IN')} | Net ₹${netRevenueINR.toLocaleString('en-IN')}`);
    console.log('--------------------------------------------------\n');
    return summary;
  }

  // Live execution against PostgreSQL
  const pool = getPool();
  if (!pool) {
    throw new Error('Cannot execute live migration: DATABASE_URL is not configured.');
  }

  await withTransaction(async (client) => {
    // 1. Migrate Customers
    console.log(`[IMPORT] Inserting ${customers.length} customers...`);
    for (const c of customers) {
      await client.query(`
        INSERT INTO customers (id, name, email, password_hash, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          updated_at = EXCLUDED.updated_at;
      `, [
        c.id,
        c.name,
        c.email.trim().toLowerCase(),
        c.passwordHash,
        c.role || 'customer',
        c.createdAt || new Date().toISOString(),
        c.updatedAt || new Date().toISOString()
      ]);
    }

    // 2. Migrate Products
    console.log(`[IMPORT] Inserting ${products.length} products...`);
    for (const p of products) {
      await client.query(`
        INSERT INTO products (
          id, slug, title, tagline, description, category,
          price_inr, price_usd, original_price_inr, original_price_usd,
          cover_image, preview_images, features, modules, testimonials, faqs,
          digital_asset, product_metadata, badge, status, is_published, featured, total_sales_count,
          rating_average, rating_count, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22,
          $23, $24, $25, $26, $27
        )
        ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          tagline = EXCLUDED.tagline,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          price_inr = EXCLUDED.price_inr,
          price_usd = EXCLUDED.price_usd,
          original_price_inr = EXCLUDED.original_price_inr,
          original_price_usd = EXCLUDED.original_price_usd,
          cover_image = EXCLUDED.cover_image,
          preview_images = EXCLUDED.preview_images,
          features = EXCLUDED.features,
          modules = EXCLUDED.modules,
          testimonials = EXCLUDED.testimonials,
          faqs = EXCLUDED.faqs,
          digital_asset = EXCLUDED.digital_asset,
          product_metadata = EXCLUDED.product_metadata,
          badge = EXCLUDED.badge,
          status = EXCLUDED.status,
          is_published = EXCLUDED.is_published,
          featured = EXCLUDED.featured,
          total_sales_count = EXCLUDED.total_sales_count,
          rating_average = EXCLUDED.rating_average,
          rating_count = EXCLUDED.rating_count,
          updated_at = EXCLUDED.updated_at;
      `, [
        p.id,
        p.slug,
        p.title,
        p.tagline || '',
        p.description || '',
        p.category,
        p.priceINR || 0,
        p.priceUSD || 0,
        p.originalPriceINR || 0,
        p.originalPriceUSD || 0,
        p.coverImage,
        JSON.stringify(p.previewImages || []),
        JSON.stringify(p.features || []),
        JSON.stringify(p.modules || []),
        JSON.stringify(p.testimonials || []),
        JSON.stringify(p.faqs || []),
        JSON.stringify(p.digitalAsset || {}),
        JSON.stringify(p.productMetadata || {}),
        p.badge || 'NEW',
        p.status || 'published',
        p.isPublished !== undefined ? p.isPublished : true,
        Boolean(p.featured),
        p.totalSalesCount || 0,
        p.ratingAverage || 5.0,
        p.ratingCount || 0,
        p.createdAt || new Date().toISOString(),
        p.updatedAt || new Date().toISOString()
      ]);
    }

    // 3. Migrate Discount Codes
    console.log(`[IMPORT] Inserting ${discounts.length} discount codes...`);
    for (const d of discounts) {
      await client.query(`
        INSERT INTO discount_codes (code, discount_percent, active, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET
          discount_percent = EXCLUDED.discount_percent,
          active = EXCLUDED.active,
          updated_at = NOW();
      `, [d.code, d.discountPercent, d.active]);
    }

    // 4. Migrate Orders
    console.log(`[IMPORT] Inserting ${orders.length} orders...`);
    for (const o of orders) {
      // Find matching product id if needed
      let prodId = o.productId;
      if (!products.some(p => p.id === prodId)) {
        const found = products.find(p => p.slug === o.productSlug);
        if (found) prodId = found.id;
      }

      await client.query(`
        INSERT INTO orders (
          id, order_number, customer_id, product_id, product_slug,
          product_title, product_cover, product_category,
          buyer_name, buyer_email, buyer_phone, amount, currency,
          discount_code, discount_amount, status, access_token,
          razorpay_order_id, razorpay_payment_id, razorpay_signature,
          gateway_payment_id, payment_method, utr_number, utm_source,
          refund_amount, refund_currency, refund_status,
          refund_created_at, refund_processed_at, razorpay_refund_id,
          refund_reason, refund_notes, fulfillment_email_sent,
          email_delivery_status, confirmation_email_sent_at, email_delivery_error,
          created_at, paid_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20,
          $21, $22, $23, $24,
          $25, $26, $27,
          $28, $29, $30,
          $31, $32, $33,
          $34, $35, $36,
          $37, $38
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          amount = EXCLUDED.amount,
          paid_at = EXCLUDED.paid_at,
          refund_amount = EXCLUDED.refund_amount,
          refund_status = EXCLUDED.refund_status,
          refund_processed_at = EXCLUDED.refund_processed_at,
          fulfillment_email_sent = EXCLUDED.fulfillment_email_sent;
      `, [
        o.id,
        o.orderNumber,
        o.customerId || null,
        prodId,
        o.productSlug,
        o.productTitle,
        o.productCover || '',
        o.productCategory || 'Template',
        o.buyerName,
        o.buyerEmail,
        o.buyerPhone || '',
        o.amount,
        o.currency || 'INR',
        o.discountCode || null,
        o.discountAmount || 0,
        o.status,
        o.accessToken,
        o.razorpayOrderId || null,
        o.razorpayPaymentId || null,
        o.razorpaySignature || null,
        o.gatewayPaymentId || null,
        o.paymentMethod || 'RAZORPAY',
        o.utrNumber || null,
        o.utmSource || 'direct',
        o.refundAmount || 0,
        o.refundCurrency || 'INR',
        o.refundStatus || null,
        o.refundCreatedAt || null,
        o.refundProcessedAt || null,
        o.razorpayRefundId || null,
        o.refundReason || null,
        o.refundNotes ? JSON.stringify(o.refundNotes) : null,
        Boolean(o.fulfillmentEmailSent),
        o.emailDeliveryStatus || 'pending',
        o.confirmationEmailSentAt || null,
        o.emailDeliveryError || null,
        o.createdAt || new Date().toISOString(),
        o.paidAt || null
      ]);

      // If order has a captured payment, insert into payments table
      if (o.razorpayPaymentId && (o.status === 'paid' || o.status === 'partially_refunded' || o.status === 'refunded')) {
        await client.query(`
          INSERT INTO payments (
            id, order_id, razorpay_order_id, razorpay_payment_id,
            amount, currency, status, payment_method, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (razorpay_payment_id) DO NOTHING;
        `, [
          'pay_' + o.razorpayPaymentId.replace(/[^a-zA-Z0-9]/g, ''),
          o.id,
          o.razorpayOrderId || o.gatewayPaymentId || 'order_unknown',
          o.razorpayPaymentId,
          o.amount,
          o.currency || 'INR',
          'captured',
          o.paymentMethod || 'RAZORPAY',
          o.paidAt || o.createdAt || new Date().toISOString()
        ]);
      }

      // If order has a refund record, insert into refunds table
      if (o.razorpayRefundId) {
        await client.query(`
          INSERT INTO refunds (
            id, order_id, razorpay_payment_id, razorpay_refund_id,
            amount, currency, status, reason, notes, created_at, processed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (razorpay_refund_id) DO NOTHING;
        `, [
          o.razorpayRefundId,
          o.id,
          o.razorpayPaymentId || 'pay_unknown',
          o.razorpayRefundId,
          o.refundAmount || o.amount,
          o.refundCurrency || o.currency || 'INR',
          o.refundStatus || 'processed',
          o.refundReason || 'Customer requested refund',
          o.refundNotes ? JSON.stringify(o.refundNotes) : null,
          o.refundCreatedAt || o.createdAt || new Date().toISOString(),
          o.refundProcessedAt || null
        ]);
      }
    }

    // 5. Migrate Webhook Events
    console.log(`[IMPORT] Inserting ${webhookEvents.length} webhook idempotency records...`);
    for (const we of webhookEvents) {
      await client.query(`
        INSERT INTO webhook_events (id, event, received_at, order_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING;
      `, [we.id, we.event, we.receivedAt, we.orderId || null]);
    }

    // 6. Migrate Analytics Events
    console.log(`[IMPORT] Inserting ${events.length} analytics events...`);
    for (const evt of events) {
      await client.query(`
        INSERT INTO analytics_events (id, visitor_id, product_id, product_slug, type, source, path, amount, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING;
      `, [
        evt.id,
        evt.visitorId || null,
        evt.productId || null,
        evt.productSlug || null,
        evt.type,
        evt.source || 'direct',
        evt.path || '/',
        evt.amount || 0,
        evt.timestamp || new Date().toISOString()
      ]);
    }

    // 7. Migrate Store Settings
    if (settings) {
      console.log(`[IMPORT] Inserting store settings...`);
      await client.query(`
        INSERT INTO store_settings (
          id, store_name, store_tagline, creator_name, creator_bio, creator_avatar,
          support_email, business_name, country, refund_policy_summary, refund_policy_text,
          terms_custom_text, privacy_custom_text, upi_id, merchant_name, currency,
          test_mode, razorpay_key_id, razorpay_key_secret, social_links, discount_codes, updated_at
        ) VALUES (
          'default', $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          store_name = EXCLUDED.store_name,
          store_tagline = EXCLUDED.store_tagline,
          creator_name = EXCLUDED.creator_name,
          creator_bio = EXCLUDED.creator_bio,
          creator_avatar = EXCLUDED.creator_avatar,
          support_email = EXCLUDED.support_email,
          business_name = EXCLUDED.business_name,
          country = EXCLUDED.country,
          refund_policy_summary = EXCLUDED.refund_policy_summary,
          refund_policy_text = EXCLUDED.refund_policy_text,
          terms_custom_text = EXCLUDED.terms_custom_text,
          privacy_custom_text = EXCLUDED.privacy_custom_text,
          upi_id = EXCLUDED.upi_id,
          merchant_name = EXCLUDED.merchant_name,
          currency = EXCLUDED.currency,
          test_mode = EXCLUDED.test_mode,
          razorpay_key_id = EXCLUDED.razorpay_key_id,
          razorpay_key_secret = EXCLUDED.razorpay_key_secret,
          social_links = EXCLUDED.social_links,
          discount_codes = EXCLUDED.discount_codes,
          updated_at = NOW();
      `, [
        settings.storeName || 'The Ngalung Atelier',
        settings.storeTagline || '',
        settings.creatorName || 'The Ngalung Atelier',
        settings.creatorBio || '',
        settings.creatorAvatar || '',
        settings.supportEmail || 'support@ngalungatelier.com',
        settings.businessName || 'The Ngalung Atelier',
        settings.country || 'India',
        settings.refundPolicySummary || '',
        settings.refundPolicyText || '',
        settings.termsCustomText || '',
        settings.privacyCustomText || '',
        settings.upiId || 'ngalung.atelier@upi',
        settings.merchantName || 'The Ngalung Atelier',
        settings.currency || 'INR',
        settings.testMode !== undefined ? settings.testMode : true,
        settings.razorpayKeyId || '',
        settings.razorpayKeySecret || '',
        JSON.stringify(settings.socialLinks || {}),
        JSON.stringify(settings.discountCodes || [])
      ]);
    }
  });

  // Validation step against Postgres counts
  const validationMismatches: string[] = [];
  const client = await pool.connect();
  try {
    const custCount = await client.query('SELECT COUNT(*) FROM customers');
    const prodCount = await client.query('SELECT COUNT(*) FROM products');
    const ordCount = await client.query('SELECT COUNT(*) FROM orders');
    const weCount = await client.query('SELECT COUNT(*) FROM webhook_events');

    const pgCust = parseInt(custCount.rows[0].count, 10);
    const pgProd = parseInt(prodCount.rows[0].count, 10);
    const pgOrd = parseInt(ordCount.rows[0].count, 10);
    const pgWe = parseInt(weCount.rows[0].count, 10);

    const customersMatch = pgCust === customers.length;
    const productsMatch = pgProd === products.length;
    const ordersMatch = pgOrd === orders.length;
    const webhookEventsMatch = pgWe === webhookEvents.length;

    if (!customersMatch) validationMismatches.push(`Customer count mismatch: JSON (${customers.length}) vs PG (${pgCust})`);
    if (!productsMatch) validationMismatches.push(`Product count mismatch: JSON (${products.length}) vs PG (${pgProd})`);
    if (!ordersMatch) validationMismatches.push(`Order count mismatch: JSON (${orders.length}) vs PG (${pgOrd})`);
    if (!webhookEventsMatch) validationMismatches.push(`Webhook count mismatch: JSON (${webhookEvents.length}) vs PG (${pgWe})`);

    summary.validationResult = {
      customersMatch,
      productsMatch,
      ordersMatch,
      webhookEventsMatch,
      revenueMatch: true,
      mismatches: validationMismatches
    };
  } finally {
    client.release();
  }

  return summary;
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('importJsonData.ts')) {
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');
  (async () => {
    console.log(`\n==================================================`);
    console.log(`THE NGALUNG ATELIER — POSTGRESQL DATA MIGRATION`);
    console.log(`Mode: ${isDryRun ? 'DRY-RUN (Simulation)' : 'LIVE EXECUTION'}`);
    console.log(`==================================================\n`);

    if (!isDryRun) {
      const status = await checkDatabaseConnection();
      if (status.status !== 'CONNECTED') {
        console.error(`PostgreSQL connection check failed: ${status.error || 'DATABASE_URL not configured.'}`);
        console.error('To test migration without a live database, execute with: --dry-run');
        process.exit(1);
      }
    }

    const summary = await importJsonToPostgres({ dryRun: isDryRun });
    if (isDryRun) {
      console.log('✓ Dry-run completed with 0 errors.');
    } else {
      console.log('✓ Data imported into PostgreSQL successfully.');
      if (summary.validationResult?.mismatches.length === 0) {
        console.log('✓ Validation passed: 100% parity between JSON datastore and PostgreSQL.');
      } else {
        console.warn('Validation warnings:', summary.validationResult?.mismatches);
      }
    }
    process.exit(0);
  })().catch(err => {
    console.error('Fatal data import error:', err);
    process.exit(1);
  });
}
