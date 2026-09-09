import crypto from 'crypto';
import { PoolClient } from 'pg';
import { getPool, query, withTransaction } from './client';
import {
  Product,
  ProductStatus,
  Article,
  ArticleStatus,
  ArticleSubmissionConfig,
  ArticleSubmissionEntitlement,
  ArticleReviewStatus,
  Order,
  OrderStatus,
  AnalyticsEvent,
  StoreSettings,
  DashboardStats,
  AnalyticsSummary,
  AnalyticsTimeRange
} from '../../src/types';
import { CustomerRecord } from '../dataStore';
import { FileStorageService } from '../fileStorage';

const DEFAULT_ARTICLE_SUBMISSION_CONFIG: ArticleSubmissionConfig = {
  enabled: true,
  priceINR: 999,
  currency: 'INR',
  guidelines: 'Submit original, useful, non-spam articles for editorial review. Publication is not guaranteed and customers cannot publish directly.'
};

function mapProductRow(row: any): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    priceINR: row.price_inr,
    priceUSD: row.price_usd,
    originalPriceINR: row.original_price_inr,
    originalPriceUSD: row.original_price_usd,
    coverImage: row.cover_image,
    previewImages: typeof row.preview_images === 'string' ? JSON.parse(row.preview_images) : row.preview_images || [],
    features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features || [],
    modules: typeof row.modules === 'string' ? JSON.parse(row.modules) : row.modules || [],
    testimonials: typeof row.testimonials === 'string' ? JSON.parse(row.testimonials) : row.testimonials || [],
    faqs: typeof row.faqs === 'string' ? JSON.parse(row.faqs) : row.faqs || [],
    digitalAsset: typeof row.digital_asset === 'string' ? JSON.parse(row.digital_asset) : row.digital_asset || {},
    badge: row.badge,
    status: row.status,
    isPublished: row.is_published,
    featured: row.featured,
    totalSalesCount: row.total_sales_count,
    ratingAverage: Number(row.rating_average) || 5.0,
    ratingCount: row.rating_count,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function mapOrderRow(row: any): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id || undefined,
    productId: row.product_id,
    productSlug: row.product_slug,
    productTitle: row.product_title,
    productCover: row.product_cover,
    productCategory: row.product_category,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone || undefined,
    amount: row.amount,
    currency: row.currency,
    discountCode: row.discount_code || undefined,
    discountAmount: row.discount_amount || 0,
    status: row.status,
    accessToken: row.access_token,
    razorpayOrderId: row.razorpay_order_id || undefined,
    razorpayPaymentId: row.razorpay_payment_id || undefined,
    razorpaySignature: row.razorpay_signature || undefined,
    gatewayPaymentId: row.gateway_payment_id || undefined,
    paymentMethod: row.payment_method,
    utrNumber: row.utr_number || undefined,
    utmSource: row.utm_source || 'direct',
    refundAmount: row.refund_amount || 0,
    refundCurrency: row.refund_currency || 'INR',
    refundStatus: row.refund_status || undefined,
    refundCreatedAt: row.refund_created_at ? new Date(row.refund_created_at).toISOString() : undefined,
    refundProcessedAt: row.refund_processed_at ? new Date(row.refund_processed_at).toISOString() : undefined,
    razorpayRefundId: row.razorpay_refund_id || undefined,
    refundReason: row.refund_reason || undefined,
    refundNotes: typeof row.refund_notes === 'string' ? JSON.parse(row.refund_notes) : row.refund_notes || undefined,
    fulfillmentEmailSent: row.fulfillment_email_sent,
    emailDeliveryStatus: row.email_delivery_status || 'pending',
    confirmationEmailSentAt: row.confirmation_email_sent_at ? new Date(row.confirmation_email_sent_at).toISOString() : undefined,
    emailDeliveryError: row.email_delivery_error || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : undefined
  };
}

function mapCustomerRow(row: any): CustomerRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role || 'customer',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function parseJsonArray(value: any): string[] {
  if (Array.isArray(value)) return value.map(item => String(item));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(item => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapArticleRow(row: any): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || '',
    content: row.content || '',
    author: row.author || 'Ng Kharinghor',
    category: row.category || 'Digital Business',
    tags: parseJsonArray(row.tags),
    featuredImage: row.featured_image || '',
    featuredImageAlt: row.featured_image_alt || '',
    primaryKeyword: row.primary_keyword || '',
    secondaryKeywords: parseJsonArray(row.secondary_keywords),
    seoTitle: row.seo_title || row.title,
    metaDescription: row.meta_description || row.excerpt || '',
    canonicalUrl: row.canonical_url || '',
    ogTitle: row.og_title || row.seo_title || row.title,
    ogDescription: row.og_description || row.meta_description || row.excerpt || '',
    ogImage: row.og_image || row.featured_image || '',
    socialShareTitle: row.social_share_title || '',
    socialShareDescription: row.social_share_description || '',
    socialShareImage: row.social_share_image || '',
    status: row.status || 'draft',
    source: row.source || 'admin',
    ownerCustomerId: row.owner_customer_id || undefined,
    ownerCustomerName: row.owner_customer_name || undefined,
    ownerCustomerEmail: row.owner_customer_email || undefined,
    reviewStatus: row.review_status || (row.status === 'published' ? 'published' : 'draft'),
    reviewFeedback: row.review_feedback || '',
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : undefined,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : undefined,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : undefined,
    entitlementId: row.entitlement_id || undefined,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    bookCta: typeof row.book_cta === 'string' ? JSON.parse(row.book_cta || '{}') : row.book_cta || undefined,
    views: Number(row.views || 0)
  };
}

function mapArticleEntitlementRow(row: any): ArticleSubmissionEntitlement {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    status: row.status || 'pending',
    orderReference: row.order_reference || undefined,
    razorpayOrderId: row.razorpay_order_id || undefined,
    razorpayPaymentId: row.razorpay_payment_id || undefined,
    amountINR: Number(row.amount_inr || 0),
    currency: row.currency || 'INR',
    articleId: row.article_id || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : undefined,
    usedAt: row.used_at ? new Date(row.used_at).toISOString() : undefined,
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : undefined
  };
}

function normalizeArticleSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'untitled-article';
}

export class PostgresStore {
  // Products
  async getProducts(): Promise<Product[]> {
    const res = await query('SELECT * FROM products ORDER BY created_at DESC');
    return res.rows.map(mapProductRow);
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const res = await query('SELECT * FROM products WHERE slug = $1 LIMIT 1', [slug]);
    if (res.rows.length === 0) return undefined;
    return mapProductRow(res.rows[0]);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const res = await query('SELECT * FROM products WHERE id = $1 LIMIT 1', [id]);
    if (res.rows.length === 0) return undefined;
    return mapProductRow(res.rows[0]);
  }

  async saveProduct(productData: Partial<Product>): Promise<Product> {
    const isPublished = productData.status
      ? productData.status === 'published'
      : (productData.isPublished !== undefined ? productData.isPublished : true);
    const status: ProductStatus = productData.status || (isPublished ? 'published' : 'draft');

    if (productData.id) {
      const existing = await this.getProductById(productData.id);
      if (existing) {
        const updated: Product = {
          ...existing,
          ...productData,
          status,
          isPublished,
          updatedAt: new Date().toISOString()
        } as Product;

        await query(`
          UPDATE products SET
            slug = $1, title = $2, tagline = $3, description = $4, category = $5,
            price_inr = $6, price_usd = $7, original_price_inr = $8, original_price_usd = $9,
            cover_image = $10, preview_images = $11, features = $12, modules = $13,
            testimonials = $14, faqs = $15, digital_asset = $16, badge = $17,
            status = $18, is_published = $19, featured = $20, updated_at = NOW()
          WHERE id = $21
        `, [
          updated.slug, updated.title, updated.tagline, updated.description, updated.category,
          updated.priceINR, updated.priceUSD, updated.originalPriceINR, updated.originalPriceUSD,
          updated.coverImage, JSON.stringify(updated.previewImages || []), JSON.stringify(updated.features || []),
          JSON.stringify(updated.modules || []), JSON.stringify(updated.testimonials || []),
          JSON.stringify(updated.faqs || []), JSON.stringify(updated.digitalAsset || {}),
          updated.badge, updated.status, updated.isPublished, updated.featured,
          updated.id
        ]);
        return updated;
      }
    }

    const newId = 'prod_' + crypto.randomBytes(6).toString('hex');
    const slug = productData.slug || (productData.title || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 1000);

    const product: Product = {
      id: newId,
      slug,
      title: productData.title || 'Untitled Product',
      tagline: productData.tagline || '',
      description: productData.description || '',
      category: productData.category || 'Template',
      priceINR: productData.priceINR || 999,
      priceUSD: productData.priceUSD || 19,
      originalPriceINR: productData.originalPriceINR || 2499,
      originalPriceUSD: productData.originalPriceUSD || 49,
      coverImage: productData.coverImage || '',
      previewImages: productData.previewImages || [],
      features: productData.features || [],
      modules: productData.modules || [],
      testimonials: productData.testimonials || [],
      faqs: productData.faqs || [],
      digitalAsset: productData.digitalAsset || {
        type: 'file_download',
        primaryUrl: '',
        accessInstructions: ''
      },
      badge: productData.badge || 'NEW',
      status,
      isPublished,
      featured: Boolean(productData.featured),
      totalSalesCount: 0,
      ratingAverage: 5.0,
      ratingCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await query(`
      INSERT INTO products (
        id, slug, title, tagline, description, category,
        price_inr, price_usd, original_price_inr, original_price_usd,
        cover_image, preview_images, features, modules, testimonials, faqs,
        digital_asset, badge, status, is_published, featured, total_sales_count,
        rating_average, rating_count, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW())
    `, [
      product.id, product.slug, product.title, product.tagline, product.description, product.category,
      product.priceINR, product.priceUSD, product.originalPriceINR, product.originalPriceUSD,
      product.coverImage, JSON.stringify(product.previewImages), JSON.stringify(product.features),
      JSON.stringify(product.modules), JSON.stringify(product.testimonials), JSON.stringify(product.faqs),
      JSON.stringify(product.digitalAsset), product.badge, product.status, product.isPublished, product.featured,
      product.totalSalesCount, product.ratingAverage, product.ratingCount
    ]);

    return product;
  }

  async hasPaidPurchases(productIdOrSlug: string): Promise<boolean> {
    const res = await query(
      `SELECT 1 FROM orders WHERE (product_id = $1 OR product_slug = $1) AND status = 'paid' LIMIT 1`,
      [productIdOrSlug]
    );
    return res.rows.length > 0;
  }

  async hasExistingOrders(productIdOrSlug: string): Promise<boolean> {
    const res = await query(
      `SELECT 1 FROM orders WHERE (product_id = $1 OR product_slug = $1) AND status IN ('paid', 'pending') LIMIT 1`,
      [productIdOrSlug]
    );
    return res.rows.length > 0;
  }

  async deleteProduct(idOrSlug: string): Promise<{ success: boolean; prevented?: boolean; message?: string }> {
    if (await this.hasPaidPurchases(idOrSlug)) {
      return {
        success: false,
        prevented: true,
        message: 'This product has existing customer purchases and cannot be permanently deleted. You can unpublish or archive it instead to remove it from the public storefront while protecting customer access.'
      };
    }

    const prod = await this.getProductById(idOrSlug) || await this.getProductBySlug(idOrSlug);
    if (!prod) {
      return { success: false, message: 'Product not found' };
    }

    return withTransaction(async (client) => {
      // Remove any pending orders
      await client.query(
        `DELETE FROM orders WHERE (product_id = $1 OR product_slug = $2) AND status != 'paid'`,
        [prod.id, prod.slug]
      );

      // Delete product
      await client.query(`DELETE FROM products WHERE id = $1`, [prod.id]);

      // Safe cleanup of private file
      if (prod.digitalAsset?.storageKey) {
        const key = prod.digitalAsset.storageKey;
        const otherRes = await client.query(
          `SELECT 1 FROM products WHERE digital_asset->>'storageKey' = $1 AND id != $2 LIMIT 1`,
          [key, prod.id]
        );
        if (otherRes.rows.length === 0) {
          FileStorageService.deletePrivateFile(key);
        }
      }

      return { success: true, message: 'Product deleted permanently from catalog' };
    });
  }

  async unpublishProduct(idOrSlug: string): Promise<{ success: boolean; product?: Product; message?: string }> {
    const prod = await this.getProductById(idOrSlug) || await this.getProductBySlug(idOrSlug);
    if (!prod) return { success: false, message: 'Product not found' };

    await query(`UPDATE products SET is_published = false, status = 'draft', updated_at = NOW() WHERE id = $1`, [prod.id]);
    const updated = await this.getProductById(prod.id);
    return { success: true, product: updated, message: 'Product unpublished and set to Draft' };
  }

  async archiveProduct(idOrSlug: string): Promise<{ success: boolean; product?: Product; message?: string }> {
    const prod = await this.getProductById(idOrSlug) || await this.getProductBySlug(idOrSlug);
    if (!prod) return { success: false, message: 'Product not found' };

    await query(`UPDATE products SET is_published = false, status = 'archived', updated_at = NOW() WHERE id = $1`, [prod.id]);
    const updated = await this.getProductById(prod.id);
    return { success: true, product: updated, message: 'Product archived successfully. Customer licenses remain active.' };
  }

  async publishProduct(idOrSlug: string): Promise<{ success: boolean; product?: Product; message?: string }> {
    const prod = await this.getProductById(idOrSlug) || await this.getProductBySlug(idOrSlug);
    if (!prod) return { success: false, message: 'Product not found' };

    await query(`UPDATE products SET is_published = true, status = 'published', updated_at = NOW() WHERE id = $1`, [prod.id]);
    const updated = await this.getProductById(prod.id);
    return { success: true, product: updated, message: 'Product published to storefront' };
  }

  // Articles
  async getArticles(includePrivate = false): Promise<Article[]> {
    const where = includePrivate ? '' : `WHERE a.status = 'published'`;
    const res = await query(`
      SELECT a.*,
        COUNT(e.id) FILTER (
          WHERE e.type IN ('article_view', 'page_view', 'visit')
          AND (e.article_slug = a.slug OR e.path = '/articles/' || a.slug)
        )::int AS views
      FROM articles a
      LEFT JOIN analytics_events e ON e.article_slug = a.slug OR e.path = '/articles/' || a.slug
      ${where}
      GROUP BY a.id
      ORDER BY COALESCE(a.published_at, a.updated_at, a.created_at) DESC
    `);
    return res.rows.map(mapArticleRow);
  }

  async getArticleBySlug(slug: string, includePrivate = false): Promise<Article | undefined> {
    const res = await query(`
      SELECT a.*,
        COUNT(e.id) FILTER (
          WHERE e.type IN ('article_view', 'page_view', 'visit')
          AND (e.article_slug = a.slug OR e.path = '/articles/' || a.slug)
        )::int AS views
      FROM articles a
      LEFT JOIN analytics_events e ON e.article_slug = a.slug OR e.path = '/articles/' || a.slug
      WHERE a.slug = $1 ${includePrivate ? '' : "AND a.status = 'published'"}
      GROUP BY a.id
      LIMIT 1
    `, [slug]);
    if (res.rows.length === 0) return undefined;
    return mapArticleRow(res.rows[0]);
  }

  async getArticleById(id: string): Promise<Article | undefined> {
    const res = await query(`
      SELECT a.*,
        COUNT(e.id) FILTER (
          WHERE e.type IN ('article_view', 'page_view', 'visit')
          AND (e.article_slug = a.slug OR e.path = '/articles/' || a.slug)
        )::int AS views
      FROM articles a
      LEFT JOIN analytics_events e ON e.article_slug = a.slug OR e.path = '/articles/' || a.slug
      WHERE a.id = $1
      GROUP BY a.id
      LIMIT 1
    `, [id]);
    if (res.rows.length === 0) return undefined;
    return mapArticleRow(res.rows[0]);
  }

  async saveArticle(articleData: Partial<Article>): Promise<Article> {
    const now = new Date().toISOString();
    const status: ArticleStatus = articleData.status || 'draft';
    const existing = articleData.id ? await this.getArticleById(articleData.id) : undefined;
    const baseSlug = normalizeArticleSlug(articleData.slug || articleData.title || 'untitled-article');
    const slug = await this.ensureUniqueArticleSlug(baseSlug, articleData.id);
    const publishedAt = status === 'published'
      ? (articleData.publishedAt || existing?.publishedAt || now)
      : articleData.publishedAt || null;

    if (existing) {
      const updated: Article = {
        ...existing,
        ...articleData,
        slug,
        status,
        tags: articleData.tags || existing.tags || [],
        secondaryKeywords: articleData.secondaryKeywords || existing.secondaryKeywords || [],
        source: articleData.source || existing.source || 'admin',
        ownerCustomerId: articleData.ownerCustomerId || existing.ownerCustomerId,
        ownerCustomerName: articleData.ownerCustomerName || existing.ownerCustomerName,
        ownerCustomerEmail: articleData.ownerCustomerEmail || existing.ownerCustomerEmail,
        reviewStatus: articleData.reviewStatus || existing.reviewStatus || (status === 'published' ? 'published' : 'draft'),
        reviewFeedback: articleData.reviewFeedback !== undefined ? articleData.reviewFeedback : existing.reviewFeedback,
        submittedAt: articleData.submittedAt || existing.submittedAt,
        reviewedAt: articleData.reviewedAt || existing.reviewedAt,
        scheduledAt: articleData.scheduledAt || existing.scheduledAt,
        entitlementId: articleData.entitlementId || existing.entitlementId,
        publishedAt: publishedAt || undefined,
        updatedAt: now
      } as Article;

      await query(`
        UPDATE articles SET
          title = $1, slug = $2, excerpt = $3, content = $4, author = $5,
          category = $6, tags = $7, featured_image = $8, featured_image_alt = $9,
          primary_keyword = $10, secondary_keywords = $11, seo_title = $12,
          meta_description = $13, canonical_url = $14, og_title = $15,
          og_description = $16, og_image = $17, social_share_title = $18,
          social_share_description = $19, social_share_image = $20, status = $21,
          published_at = $22, book_cta = $23, source = $24,
          owner_customer_id = $25, owner_customer_name = $26, owner_customer_email = $27,
          review_status = $28, review_feedback = $29, submitted_at = $30,
          reviewed_at = $31, scheduled_at = $32, entitlement_id = $33,
          updated_at = NOW()
        WHERE id = $34
      `, [
        updated.title, updated.slug, updated.excerpt, updated.content, updated.author,
        updated.category, JSON.stringify(updated.tags || []), updated.featuredImage, updated.featuredImageAlt,
        updated.primaryKeyword, JSON.stringify(updated.secondaryKeywords || []), updated.seoTitle,
        updated.metaDescription, updated.canonicalUrl || null, updated.ogTitle,
        updated.ogDescription, updated.ogImage, updated.socialShareTitle || null,
        updated.socialShareDescription || null, updated.socialShareImage || null, updated.status,
        updated.publishedAt || null, JSON.stringify(updated.bookCta || {}), updated.source || 'admin',
        updated.ownerCustomerId || null, updated.ownerCustomerName || null, updated.ownerCustomerEmail || null,
        updated.reviewStatus || (updated.status === 'published' ? 'published' : 'draft'), updated.reviewFeedback || null,
        updated.submittedAt || null, updated.reviewedAt || null, updated.scheduledAt || null,
        updated.entitlementId || null, updated.id
      ]);
      return (await this.getArticleById(updated.id)) || updated;
    }

    const article: Article = {
      id: 'art_' + crypto.randomBytes(8).toString('hex'),
      title: articleData.title || 'Untitled Article',
      slug,
      excerpt: articleData.excerpt || '',
      content: articleData.content || '',
      author: articleData.author || 'Ng Kharinghor',
      category: articleData.category || 'Digital Business',
      tags: articleData.tags || [],
      featuredImage: articleData.featuredImage || '',
      featuredImageAlt: articleData.featuredImageAlt || '',
      primaryKeyword: articleData.primaryKeyword || '',
      secondaryKeywords: articleData.secondaryKeywords || [],
      seoTitle: articleData.seoTitle || articleData.title || 'Untitled Article',
      metaDescription: articleData.metaDescription || articleData.excerpt || '',
      canonicalUrl: articleData.canonicalUrl || '',
      ogTitle: articleData.ogTitle || articleData.seoTitle || articleData.title || 'Untitled Article',
      ogDescription: articleData.ogDescription || articleData.metaDescription || articleData.excerpt || '',
      ogImage: articleData.ogImage || articleData.featuredImage || '',
      socialShareTitle: articleData.socialShareTitle || articleData.ogTitle || articleData.seoTitle || articleData.title || '',
      socialShareDescription: articleData.socialShareDescription || articleData.ogDescription || articleData.metaDescription || articleData.excerpt || '',
      socialShareImage: articleData.socialShareImage || articleData.ogImage || articleData.featuredImage || '',
      status,
      source: articleData.source || 'admin',
      ownerCustomerId: articleData.ownerCustomerId,
      ownerCustomerName: articleData.ownerCustomerName,
      ownerCustomerEmail: articleData.ownerCustomerEmail,
      reviewStatus: articleData.reviewStatus || (status === 'published' ? 'published' : 'draft'),
      reviewFeedback: articleData.reviewFeedback || '',
      submittedAt: articleData.submittedAt,
      reviewedAt: articleData.reviewedAt,
      scheduledAt: articleData.scheduledAt,
      entitlementId: articleData.entitlementId,
      publishedAt: publishedAt || undefined,
      createdAt: now,
      updatedAt: now,
      bookCta: articleData.bookCta
    };

    await query(`
      INSERT INTO articles (
        id, title, slug, excerpt, content, author, category, tags,
        featured_image, featured_image_alt, primary_keyword, secondary_keywords,
        seo_title, meta_description, canonical_url, og_title, og_description,
        og_image, social_share_title, social_share_description, social_share_image,
        status, published_at, book_cta, source, owner_customer_id, owner_customer_name,
        owner_customer_email, review_status, review_feedback, submitted_at, reviewed_at,
        scheduled_at, entitlement_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27,
        $28, $29, $30, $31, $32,
        $33, $34, NOW(), NOW()
      )
    `, [
      article.id, article.title, article.slug, article.excerpt, article.content, article.author, article.category,
      JSON.stringify(article.tags || []), article.featuredImage, article.featuredImageAlt, article.primaryKeyword,
      JSON.stringify(article.secondaryKeywords || []), article.seoTitle, article.metaDescription, article.canonicalUrl || null,
      article.ogTitle, article.ogDescription, article.ogImage, article.socialShareTitle || null,
      article.socialShareDescription || null, article.socialShareImage || null, article.status,
      article.publishedAt || null, JSON.stringify(article.bookCta || {}), article.source || 'admin',
      article.ownerCustomerId || null, article.ownerCustomerName || null, article.ownerCustomerEmail || null,
      article.reviewStatus || (article.status === 'published' ? 'published' : 'draft'), article.reviewFeedback || null,
      article.submittedAt || null, article.reviewedAt || null, article.scheduledAt || null,
      article.entitlementId || null
    ]);

    return article;
  }

  async publishArticle(idOrSlug: string): Promise<{ success: boolean; article?: Article; message?: string }> {
    const article = await this.getArticleById(idOrSlug) || await this.getArticleBySlug(idOrSlug, true);
    if (!article) return { success: false, message: 'Article not found' };
    await query(`UPDATE articles SET status = 'published', review_status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $1`, [article.id]);
    return { success: true, article: await this.getArticleById(article.id), message: 'Article published' };
  }

  async unpublishArticle(idOrSlug: string): Promise<{ success: boolean; article?: Article; message?: string }> {
    const article = await this.getArticleById(idOrSlug) || await this.getArticleBySlug(idOrSlug, true);
    if (!article) return { success: false, message: 'Article not found' };
    await query(`UPDATE articles SET status = 'draft', review_status = CASE WHEN source = 'customer' THEN COALESCE(NULLIF(review_status, 'published'), 'approved') ELSE 'draft' END, updated_at = NOW() WHERE id = $1`, [article.id]);
    return { success: true, article: await this.getArticleById(article.id), message: 'Article moved to draft' };
  }

  async archiveArticle(idOrSlug: string): Promise<{ success: boolean; article?: Article; message?: string }> {
    const article = await this.getArticleById(idOrSlug) || await this.getArticleBySlug(idOrSlug, true);
    if (!article) return { success: false, message: 'Article not found' };
    await query(`UPDATE articles SET status = 'archived', review_status = 'archived', updated_at = NOW() WHERE id = $1`, [article.id]);
    return { success: true, article: await this.getArticleById(article.id), message: 'Article archived' };
  }

  async deleteArticle(idOrSlug: string): Promise<{ success: boolean; message?: string }> {
    const article = await this.getArticleById(idOrSlug) || await this.getArticleBySlug(idOrSlug, true);
    if (!article) return { success: false, message: 'Article not found' };
    await query(`DELETE FROM articles WHERE id = $1`, [article.id]);
    return { success: true, message: 'Article deleted' };
  }

  async getArticleSubmissionConfig(): Promise<ArticleSubmissionConfig> {
    const settings = await this.getSettings();
    return settings.articleSubmission || DEFAULT_ARTICLE_SUBMISSION_CONFIG;
  }

  async createPendingArticleEntitlement(params: {
    customerId: string;
    customerEmail: string;
    amountINR: number;
    razorpayOrderId: string;
    orderReference: string;
  }): Promise<ArticleSubmissionEntitlement> {
    const existing = await query(
      'SELECT * FROM article_submission_entitlements WHERE razorpay_order_id = $1 LIMIT 1',
      [params.razorpayOrderId]
    );
    if (existing.rows.length > 0) return mapArticleEntitlementRow(existing.rows[0]);

    const id = 'art_credit_' + crypto.randomBytes(8).toString('hex');
    const res = await query(`
      INSERT INTO article_submission_entitlements (
        id, customer_id, customer_email, status, order_reference,
        razorpay_order_id, amount_inr, currency, created_at
      ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, 'INR', NOW())
      RETURNING *
    `, [id, params.customerId, params.customerEmail, params.orderReference, params.razorpayOrderId, params.amountINR]);
    return mapArticleEntitlementRow(res.rows[0]);
  }

  async verifyArticleEntitlement(params: {
    customerId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
  }): Promise<ArticleSubmissionEntitlement | undefined> {
    return withTransaction(async (client: PoolClient) => {
      const found = await client.query(
        'SELECT * FROM article_submission_entitlements WHERE customer_id = $1 AND razorpay_order_id = $2 FOR UPDATE',
        [params.customerId, params.razorpayOrderId]
      );
      if (found.rows.length === 0) return undefined;
      const entitlement = mapArticleEntitlementRow(found.rows[0]);
      if (entitlement.status === 'active' || entitlement.status === 'used') {
        return entitlement;
      }
      const updated = await client.query(`
        UPDATE article_submission_entitlements
        SET status = 'active', razorpay_payment_id = $1, verified_at = COALESCE(verified_at, NOW())
        WHERE id = $2
        RETURNING *
      `, [params.razorpayPaymentId, entitlement.id]);
      return mapArticleEntitlementRow(updated.rows[0]);
    });
  }

  async getArticleEntitlementsByCustomer(customerId: string): Promise<ArticleSubmissionEntitlement[]> {
    const res = await query(
      'SELECT * FROM article_submission_entitlements WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );
    return res.rows.map(mapArticleEntitlementRow);
  }

  async getUnusedArticleEntitlement(customerId: string): Promise<ArticleSubmissionEntitlement | undefined> {
    const res = await query(
      "SELECT * FROM article_submission_entitlements WHERE customer_id = $1 AND status = 'active' ORDER BY created_at ASC LIMIT 1",
      [customerId]
    );
    if (res.rows.length === 0) return undefined;
    return mapArticleEntitlementRow(res.rows[0]);
  }

  async getCustomerArticles(customerId: string): Promise<Article[]> {
    const res = await query(
      'SELECT * FROM articles WHERE owner_customer_id = $1 ORDER BY COALESCE(updated_at, created_at) DESC',
      [customerId]
    );
    return res.rows.map(mapArticleRow);
  }

  async getCustomerArticleById(customerId: string, articleId: string): Promise<Article | undefined> {
    const res = await query(
      'SELECT * FROM articles WHERE id = $1 AND owner_customer_id = $2 LIMIT 1',
      [articleId, customerId]
    );
    if (res.rows.length === 0) return undefined;
    return mapArticleRow(res.rows[0]);
  }

  async saveCustomerArticle(customer: { id: string; name: string; email: string }, articleData: Partial<Article>): Promise<Article> {
    const existing = articleData.id ? await this.getCustomerArticleById(customer.id, articleData.id) : undefined;
    if (!existing) {
      const entitlement = await this.getUnusedArticleEntitlement(customer.id);
      if (!entitlement) {
        throw new Error('A verified article submission credit is required before creating a customer article.');
      }
      return this.saveArticle({
        ...articleData,
        source: 'customer',
        ownerCustomerId: customer.id,
        ownerCustomerName: customer.name,
        ownerCustomerEmail: customer.email,
        author: articleData.author || customer.name,
        status: 'draft',
        reviewStatus: 'ready_to_submit',
        entitlementId: entitlement.id
      });
    }

    const lockedStatuses: ArticleReviewStatus[] = ['submitted', 'under_review', 'approved', 'published'];
    if (lockedStatuses.includes(existing.reviewStatus || 'draft')) {
      throw new Error('This article is under review or already approved. Wait for admin feedback before editing.');
    }

    return this.saveArticle({
      ...existing,
      ...articleData,
      id: existing.id,
      source: 'customer',
      ownerCustomerId: customer.id,
      ownerCustomerName: customer.name,
      ownerCustomerEmail: customer.email,
      status: 'draft',
      reviewStatus: existing.reviewStatus === 'changes_requested' ? 'changes_requested' : 'ready_to_submit',
      entitlementId: existing.entitlementId
    });
  }

  async submitCustomerArticle(customerId: string, articleId: string): Promise<{ success: boolean; article?: Article; message?: string }> {
    return withTransaction(async (client: PoolClient) => {
      const articleRes = await client.query(
        'SELECT * FROM articles WHERE id = $1 AND owner_customer_id = $2 FOR UPDATE',
        [articleId, customerId]
      );
      if (articleRes.rows.length === 0) return { success: false, message: 'Article not found' };
      const article = mapArticleRow(articleRes.rows[0]);
      if (!article.entitlementId) return { success: false, message: 'A verified article submission credit is required.' };

      const entitlementRes = await client.query(
        'SELECT * FROM article_submission_entitlements WHERE id = $1 AND customer_id = $2 FOR UPDATE',
        [article.entitlementId, customerId]
      );
      if (entitlementRes.rows.length === 0) {
        return { success: false, message: 'A verified unused article submission credit is required.' };
      }
      const entitlement = mapArticleEntitlementRow(entitlementRes.rows[0]);
      if (entitlement.status !== 'active' && entitlement.status !== 'used') {
        return { success: false, message: 'A verified unused article submission credit is required.' };
      }

      if (entitlement.status === 'active') {
        await client.query(`
          UPDATE article_submission_entitlements
          SET status = 'used', article_id = $1, used_at = COALESCE(used_at, NOW())
          WHERE id = $2
        `, [article.id, entitlement.id]);
      }

      const updated = await client.query(`
        UPDATE articles
        SET review_status = 'submitted', submitted_at = COALESCE(submitted_at, NOW()), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [article.id]);
      return {
        success: true,
        article: mapArticleRow(updated.rows[0]),
        message: 'Article submitted for admin review.'
      };
    });
  }

  async updateArticleReview(idOrSlug: string, reviewStatus: ArticleReviewStatus, feedback?: string): Promise<{ success: boolean; article?: Article; message?: string }> {
    const article = await this.getArticleById(idOrSlug) || await this.getArticleBySlug(idOrSlug, true);
    if (!article) return { success: false, message: 'Article not found' };

    const nextStatus: ArticleStatus = reviewStatus === 'published'
      ? 'published'
      : reviewStatus === 'archived'
        ? 'archived'
        : article.status;
    const res = await query(`
      UPDATE articles
      SET review_status = $1,
          review_feedback = $2,
          reviewed_at = NOW(),
          status = $3,
          published_at = CASE WHEN $1 = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [reviewStatus, feedback !== undefined ? feedback : article.reviewFeedback || null, nextStatus, article.id]);

    return { success: true, article: mapArticleRow(res.rows[0]), message: 'Article review updated.' };
  }

  async getRelatedArticles(article: Article, limit = 3): Promise<Article[]> {
    const tags = article.tags || [];
    const res = await query(`
      SELECT a.*,
        COUNT(e.id) FILTER (
          WHERE e.type IN ('article_view', 'page_view', 'visit')
          AND (e.article_slug = a.slug OR e.path = '/articles/' || a.slug)
        )::int AS views,
        CASE WHEN a.category = $2 THEN 2 ELSE 0 END +
        COALESCE((
          SELECT COUNT(*)::int
          FROM jsonb_array_elements_text(a.tags) tag
          WHERE LOWER(tag) = ANY($3::text[])
        ), 0) AS relevance
      FROM articles a
      LEFT JOIN analytics_events e ON e.article_slug = a.slug OR e.path = '/articles/' || a.slug
      WHERE a.status = 'published' AND a.id != $1
      GROUP BY a.id
      HAVING CASE WHEN a.category = $2 THEN 2 ELSE 0 END +
        COALESCE((
          SELECT COUNT(*)::int
          FROM jsonb_array_elements_text(a.tags) tag
          WHERE LOWER(tag) = ANY($3::text[])
        ), 0) > 0
      ORDER BY relevance DESC, COALESCE(a.published_at, a.updated_at, a.created_at) DESC
      LIMIT $4
    `, [article.id, article.category, tags.map(t => t.toLowerCase()), limit]);
    return res.rows.map(mapArticleRow);
  }

  async getArticleViews(slug: string): Promise<number> {
    const res = await query(`
      SELECT COUNT(*)::int AS count
      FROM analytics_events
      WHERE type IN ('article_view', 'page_view', 'visit')
      AND (article_slug = $1 OR path = $2)
    `, [slug, `/articles/${slug}`]);
    return Number(res.rows[0]?.count || 0);
  }

  private async ensureUniqueArticleSlug(slug: string, currentId?: string): Promise<string> {
    let nextSlug = slug;
    let suffix = 2;
    while (true) {
      const res = await query(
        'SELECT id FROM articles WHERE slug = $1 AND ($2::varchar IS NULL OR id != $2) LIMIT 1',
        [nextSlug, currentId || null]
      );
      if (res.rows.length === 0) return nextSlug;
      nextSlug = `${slug}-${suffix}`;
      suffix += 1;
    }
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    const res = await query('SELECT * FROM orders ORDER BY created_at DESC');
    return res.rows.map(mapOrderRow);
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    const res = await query('SELECT * FROM orders WHERE LOWER(buyer_email) = LOWER($1) ORDER BY created_at DESC', [email.trim()]);
    return res.rows.map(mapOrderRow);
  }

  async getOrderByToken(token: string): Promise<Order | undefined> {
    const res = await query('SELECT * FROM orders WHERE access_token = $1 LIMIT 1', [token]);
    if (res.rows.length === 0) return undefined;
    return mapOrderRow(res.rows[0]);
  }

  async getOrderByAccessToken(token: string): Promise<Order | undefined> {
    return this.getOrderByToken(token);
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const res = await query('SELECT * FROM orders WHERE id = $1 OR order_number = $1 LIMIT 1', [id]);
    if (res.rows.length === 0) return undefined;
    return mapOrderRow(res.rows[0]);
  }

  async getOrderByRazorpayOrderId(rzpOrderId: string): Promise<Order | undefined> {
    if (!rzpOrderId) return undefined;
    const res = await query('SELECT * FROM orders WHERE razorpay_order_id = $1 OR gateway_payment_id = $1 LIMIT 1', [rzpOrderId]);
    if (res.rows.length === 0) return undefined;
    return mapOrderRow(res.rows[0]);
  }

  async getOrderByRazorpayPaymentId(paymentId: string): Promise<Order | undefined> {
    if (!paymentId) return undefined;
    const res = await query('SELECT * FROM orders WHERE razorpay_payment_id = $1 OR gateway_payment_id = $1 LIMIT 1', [paymentId]);
    if (res.rows.length === 0) return undefined;
    return mapOrderRow(res.rows[0]);
  }

  async getOrderByRefundId(refundId: string): Promise<Order | undefined> {
    if (!refundId) return undefined;
    const res = await query('SELECT * FROM orders WHERE razorpay_refund_id = $1 LIMIT 1', [refundId]);
    if (res.rows.length === 0) return undefined;
    return mapOrderRow(res.rows[0]);
  }

  async deleteOrder(id: string): Promise<boolean> {
    return withTransaction(async (client) => {
      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 OR order_number = $1 LIMIT 1', [id]);
      if (orderRes.rows.length === 0) return false;
      const order = mapOrderRow(orderRes.rows[0]);

      if (order.status === 'paid' || order.status === 'partially_refunded') {
        await client.query(
          'UPDATE products SET total_sales_count = GREATEST(0, total_sales_count - 1) WHERE id = $1',
          [order.productId]
        );
      }

      await client.query('DELETE FROM orders WHERE id = $1', [order.id]);
      return true;
    });
  }

  /**
   * Safe, transactional, concurrent-safe order status update with row locking.
   */
  async updateOrderStatus(orderId: string, status: OrderStatus, details?: Partial<Order>): Promise<Order | undefined> {
    return withTransaction(async (client) => {
      // Row lock to prevent race conditions during concurrent verification and webhook requests
      const res = await client.query(
        'SELECT * FROM orders WHERE id = $1 OR order_number = $1 OR razorpay_order_id = $1 FOR UPDATE',
        [orderId]
      );

      if (res.rows.length === 0) return undefined;
      const order = mapOrderRow(res.rows[0]);
      const previousStatus = order.status;

      // 1. REFUNDED cannot be downgraded
      if (previousStatus === 'refunded' && status !== 'refunded') {
        console.warn(`[POSTGRES SECURITY] Prevented downgrade of finalized REFUNDED order ${order.orderNumber} to '${status}'.`);
        return order;
      }

      // 2. PARTIALLY_REFUNDED cannot be downgraded
      if (previousStatus === 'partially_refunded' && status !== 'partially_refunded' && status !== 'refunded') {
        console.warn(`[POSTGRES SECURITY] Prevented downgrade of PARTIALLY_REFUNDED order ${order.orderNumber} to '${status}'.`);
        return order;
      }

      // 3. PAID cannot be downgraded to pending/failed
      if (previousStatus === 'paid' && status !== 'paid' && status !== 'partially_refunded' && status !== 'refunded') {
        console.warn(`[POSTGRES SECURITY] Prevented downgrade of PAID order ${order.orderNumber} to '${status}'.`);
        return order;
      }

      let newPaidAt = order.paidAt;
      if (status === 'paid' && !order.paidAt) {
        newPaidAt = new Date().toISOString();
      }

      let refundAmount = details?.refundAmount !== undefined ? details.refundAmount : order.refundAmount;
      if (status === 'refunded' && (refundAmount === undefined || refundAmount === 0)) {
        refundAmount = order.amount;
      }

      const rzpPaymentId = details?.razorpayPaymentId || order.razorpayPaymentId;
      const rzpOrderId = details?.razorpayOrderId || order.razorpayOrderId;
      const rzpSig = details?.razorpaySignature || order.razorpaySignature;
      const rzpRefId = details?.razorpayRefundId || order.razorpayRefundId;
      const refStatus = details?.refundStatus || order.refundStatus || (status === 'refunded' ? 'processed' : undefined);
      const refProcessedAt = details?.refundProcessedAt || (status === 'refunded' ? new Date().toISOString() : undefined);

      await client.query(`
        UPDATE orders SET
          status = $1,
          paid_at = $2,
          razorpay_payment_id = COALESCE($3, razorpay_payment_id),
          razorpay_order_id = COALESCE($4, razorpay_order_id),
          razorpay_signature = COALESCE($5, razorpay_signature),
          refund_amount = $6,
          refund_status = $7,
          refund_processed_at = $8,
          razorpay_refund_id = COALESCE($9, razorpay_refund_id)
        WHERE id = $10
      `, [
        status,
        newPaidAt,
        rzpPaymentId || null,
        rzpOrderId || null,
        rzpSig || null,
        refundAmount || 0,
        refStatus || null,
        refProcessedAt || null,
        rzpRefId || null,
        order.id
      ]);

      // Atomic transition to PAID (Increment product sales count exactly once)
      if (status === 'paid' && previousStatus !== 'paid' && previousStatus !== 'partially_refunded' && previousStatus !== 'refunded') {
        await client.query(
          'UPDATE products SET total_sales_count = total_sales_count + 1 WHERE id = $1',
          [order.productId]
        );

        // Record payment in payments ledger
        if (rzpPaymentId) {
          await client.query(`
            INSERT INTO payments (
              id, order_id, razorpay_order_id, razorpay_payment_id,
              amount, currency, status, payment_method, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (razorpay_payment_id) DO NOTHING;
          `, [
            'pay_' + rzpPaymentId.replace(/[^a-zA-Z0-9]/g, ''),
            order.id,
            rzpOrderId || order.gatewayPaymentId || 'order_gateway',
            rzpPaymentId,
            order.amount,
            order.currency,
            'captured',
            order.paymentMethod
          ]);
        }

        // Record analytics purchase event
        await client.query(`
          INSERT INTO analytics_events (id, product_id, product_slug, type, source, path, amount, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          'evt_' + Math.random().toString(36).substring(2, 9),
          order.productId,
          order.productSlug,
          'purchase',
          order.utmSource || 'direct',
          `/access/${order.accessToken}`,
          order.amount
        ]);
      }

      // Transition to REFUNDED (Decrement sales counter)
      if (status === 'refunded' && (previousStatus === 'paid' || previousStatus === 'partially_refunded')) {
        await client.query(
          'UPDATE products SET total_sales_count = GREATEST(0, total_sales_count - 1) WHERE id = $1',
          [order.productId]
        );

        if (rzpRefId) {
          await client.query(`
            INSERT INTO refunds (
              id, order_id, razorpay_payment_id, razorpay_refund_id,
              amount, currency, status, reason, created_at, processed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            ON CONFLICT (razorpay_refund_id) DO NOTHING;
          `, [
            rzpRefId,
            order.id,
            rzpPaymentId || 'pay_unknown',
            rzpRefId,
            refundAmount || order.amount,
            order.currency,
            'processed',
            details?.refundReason || 'Refund processed'
          ]);
        }
      }

      const updatedRes = await client.query('SELECT * FROM orders WHERE id = $1', [order.id]);
      return mapOrderRow(updatedRes.rows[0]);
    });
  }

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const newId = 'ord_' + crypto.randomBytes(8).toString('hex');
    const orderNumber = 'ORD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const token = 'acc_' + crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const isPaid = orderData.status === 'paid';

    const order: Order = {
      id: newId,
      orderNumber,
      customerId: orderData.customerId,
      productId: orderData.productId || '',
      productSlug: orderData.productSlug || '',
      productTitle: orderData.productTitle || 'Digital Product',
      productCover: orderData.productCover || '',
      productCategory: orderData.productCategory || 'Template',
      buyerName: orderData.buyerName || 'Valued Customer',
      buyerEmail: orderData.buyerEmail || '',
      buyerPhone: orderData.buyerPhone || '',
      amount: orderData.amount || 0,
      currency: orderData.currency || 'INR',
      discountCode: orderData.discountCode,
      discountAmount: orderData.discountAmount || 0,
      status: orderData.status || 'pending',
      accessToken: token,
      razorpayOrderId: orderData.razorpayOrderId,
      razorpayPaymentId: orderData.razorpayPaymentId,
      razorpaySignature: orderData.razorpaySignature,
      gatewayPaymentId: orderData.gatewayPaymentId,
      paymentMethod: orderData.paymentMethod || 'RAZORPAY',
      utrNumber: orderData.utrNumber,
      utmSource: orderData.utmSource || 'direct',
      createdAt: now,
      paidAt: isPaid ? now : undefined,
      fulfillmentEmailSent: orderData.fulfillmentEmailSent || false,
      emailDeliveryStatus: orderData.emailDeliveryStatus || (isPaid ? 'sent' : 'pending'),
      confirmationEmailSentAt: orderData.confirmationEmailSentAt,
      emailDeliveryError: orderData.emailDeliveryError
    };

    return withTransaction(async (client) => {
      await client.query(`
        INSERT INTO orders (
          id, order_number, customer_id, product_id, product_slug,
          product_title, product_cover, product_category,
          buyer_name, buyer_email, buyer_phone, amount, currency,
          discount_code, discount_amount, status, access_token,
          razorpay_order_id, razorpay_payment_id, razorpay_signature,
          gateway_payment_id, payment_method, utr_number, utm_source,
          fulfillment_email_sent, email_delivery_status, created_at, paid_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20,
          $21, $22, $23, $24,
          $25, $26, NOW(), $27
        )
      `, [
        order.id, order.orderNumber, order.customerId || null, order.productId, order.productSlug,
        order.productTitle, order.productCover, order.productCategory,
        order.buyerName, order.buyerEmail, order.buyerPhone || '', order.amount, order.currency,
        order.discountCode || null, order.discountAmount || 0, order.status, order.accessToken,
        order.razorpayOrderId || null, order.razorpayPaymentId || null, order.razorpaySignature || null,
        order.gatewayPaymentId || null, order.paymentMethod, order.utrNumber || null, order.utmSource || 'direct',
        order.fulfillmentEmailSent, order.emailDeliveryStatus, isPaid ? now : null
      ]);

      if (isPaid) {
        await client.query('UPDATE products SET total_sales_count = total_sales_count + 1 WHERE id = $1', [order.productId]);
        await client.query(`
          INSERT INTO analytics_events (id, product_id, product_slug, type, source, path, amount, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          'evt_' + Math.random().toString(36).substring(2, 9),
          order.productId,
          order.productSlug,
          'purchase',
          order.utmSource || 'direct',
          `/access/${order.accessToken}`,
          order.amount
        ]);
      }

      return order;
    });
  }

  async recordEmailDelivery(orderId: string, status: 'sent' | 'failed' | 'not_configured', error?: string): Promise<Order | undefined> {
    const isSent = status === 'sent';
    const res = await query(`
      UPDATE orders SET
        email_delivery_status = $1,
        fulfillment_email_sent = CASE WHEN $1 = 'sent' THEN true ELSE fulfillment_email_sent END,
        confirmation_email_sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE confirmation_email_sent_at END,
        email_delivery_error = $2
      WHERE id = $3 OR order_number = $3 OR razorpay_order_id = $3
      RETURNING *
    `, [status, error || null, orderId]);

    if (res.rows.length === 0) return undefined;
    return mapOrderRow(res.rows[0]);
  }

  // Webhook Event Idempotency Tracking (PostgreSQL Persistent)
  async hasProcessedWebhookEvent(eventId: string): Promise<boolean> {
    if (!eventId || typeof eventId !== 'string') return false;
    const res = await query('SELECT 1 FROM webhook_events WHERE id = $1 LIMIT 1', [eventId]);
    return res.rows.length > 0;
  }

  async recordWebhookEvent(eventId: string, eventType: string, orderId?: string): Promise<boolean> {
    if (!eventId || typeof eventId !== 'string') return false;
    const res = await query(`
      INSERT INTO webhook_events (id, event, received_at, order_id)
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `, [eventId, eventType, orderId || null]);
    return res.rows.length > 0;
  }

  // Customer Management
  async getCustomers(): Promise<CustomerRecord[]> {
    const res = await query('SELECT * FROM customers ORDER BY created_at DESC');
    return res.rows.map(mapCustomerRow);
  }

  async getCustomerById(id: string): Promise<CustomerRecord | undefined> {
    const res = await query('SELECT * FROM customers WHERE id = $1 LIMIT 1', [id]);
    if (res.rows.length === 0) return undefined;
    return mapCustomerRow(res.rows[0]);
  }

  async getCustomerByEmail(email: string): Promise<CustomerRecord | undefined> {
    const res = await query('SELECT * FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1', [email.trim()]);
    if (res.rows.length === 0) return undefined;
    return mapCustomerRow(res.rows[0]);
  }

  async createCustomer(name: string, email: string, passwordHash: string): Promise<CustomerRecord> {
    const normalizedEmail = email.trim().toLowerCase();
    const newId = 'cust_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    const res = await query(`
      INSERT INTO customers (id, name, email, password_hash, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'customer', NOW(), NOW())
      RETURNING *
    `, [newId, name.trim(), normalizedEmail, passwordHash]);

    return mapCustomerRow(res.rows[0]);
  }

  async updateCustomer(id: string, updates: { name?: string; passwordHash?: string }): Promise<CustomerRecord | undefined> {
    const current = await this.getCustomerById(id);
    if (!current) return undefined;

    const newName = updates.name ? updates.name.trim() : current.name;
    const newHash = updates.passwordHash || current.passwordHash;

    const res = await query(`
      UPDATE customers SET name = $1, password_hash = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [newName, newHash, id]);

    if (res.rows.length === 0) return undefined;
    return mapCustomerRow(res.rows[0]);
  }

  async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    const res = await query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [customerId]);
    return res.rows.map(mapOrderRow);
  }

  async getOrdersByCustomer(customer: { id: string; email: string }): Promise<Order[]> {
    const res = await query(
      'SELECT * FROM orders WHERE customer_id = $1 OR LOWER(buyer_email) = LOWER($2) ORDER BY created_at DESC',
      [customer.id, customer.email.trim()]
    );
    return res.rows.map(mapOrderRow);
  }

  // Analytics Events
  async logEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<AnalyticsEvent> {
    const id = 'evt_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();
    await query(`
      INSERT INTO analytics_events (id, visitor_id, product_id, product_slug, article_id, article_slug, type, source, path, amount, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `, [
      id,
      event.visitorId || null,
      event.productId || null,
      event.productSlug || null,
      event.articleId || null,
      event.articleSlug || null,
      event.type,
      event.source || 'direct',
      event.path || '/',
      event.amount || 0
    ]);
    return { ...event, id, timestamp: now };
  }

  // Settings
  async getSettings(): Promise<StoreSettings> {
    const res = await query('SELECT * FROM store_settings WHERE id = $1 LIMIT 1', ['default']);
    if (res.rows.length === 0) {
      // Return default
      return {
        storeName: 'The Ngalung Atelier',
        storeTagline: 'Handcrafted Notion templates, docs, and spreadsheet systems.',
        creatorName: 'The Ngalung Atelier',
        creatorBio: 'Dedicated to artisanal digital craftsmanship.',
        creatorAvatar: '',
        supportEmail: 'support@ngalungatelier.com',
        businessName: 'The Ngalung Atelier',
        country: 'India',
        upiId: 'ngalung.atelier@upi',
        merchantName: 'The Ngalung Atelier',
        currency: 'INR',
        testMode: true,
        razorpayKeyId: '',
        razorpayKeySecret: '',
        socialLinks: {},
        discountCodes: [],
        articleSubmission: DEFAULT_ARTICLE_SUBMISSION_CONFIG
      };
    }
    const row = res.rows[0];
    return {
      storeName: row.store_name,
      storeTagline: row.store_tagline,
      creatorName: row.creator_name,
      creatorBio: row.creator_bio,
      creatorAvatar: row.creator_avatar,
      supportEmail: row.support_email,
      businessName: row.business_name,
      country: row.country,
      refundPolicySummary: row.refund_policy_summary,
      refundPolicyText: row.refund_policy_text,
      termsCustomText: row.terms_custom_text,
      privacyCustomText: row.privacy_custom_text,
      upiId: row.upi_id,
      merchantName: row.merchant_name,
      currency: row.currency,
      testMode: row.test_mode,
      razorpayKeyId: row.razorpay_key_id,
      razorpayKeySecret: row.razorpay_key_secret,
      socialLinks: typeof row.social_links === 'string' ? JSON.parse(row.social_links) : row.social_links || {},
      discountCodes: typeof row.discount_codes === 'string' ? JSON.parse(row.discount_codes) : row.discount_codes || [],
      articleSubmission: typeof row.article_submission === 'string'
        ? JSON.parse(row.article_submission)
        : row.article_submission || DEFAULT_ARTICLE_SUBMISSION_CONFIG
    };
  }

  async updateSettings(newSettings: Partial<StoreSettings>): Promise<StoreSettings> {
    const current = await this.getSettings();
    const updated: StoreSettings = { ...current, ...newSettings };

    await query(`
      INSERT INTO store_settings (
        id, store_name, store_tagline, creator_name, creator_bio, creator_avatar,
        support_email, business_name, country, refund_policy_summary, refund_policy_text,
        terms_custom_text, privacy_custom_text, upi_id, merchant_name, currency,
        test_mode, razorpay_key_id, razorpay_key_secret, social_links, discount_codes, article_submission, updated_at
      ) VALUES (
        'default', $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, NOW()
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
        article_submission = EXCLUDED.article_submission,
        updated_at = NOW();
    `, [
      updated.storeName, updated.storeTagline, updated.creatorName, updated.creatorBio, updated.creatorAvatar,
      updated.supportEmail, updated.businessName, updated.country, updated.refundPolicySummary, updated.refundPolicyText,
      updated.termsCustomText, updated.privacyCustomText, updated.upiId, updated.merchantName, updated.currency,
      updated.testMode, updated.razorpayKeyId, updated.razorpayKeySecret,
      JSON.stringify(updated.socialLinks || {}), JSON.stringify(updated.discountCodes || []),
      JSON.stringify(updated.articleSubmission || DEFAULT_ARTICLE_SUBMISSION_CONFIG)
    ]);

    return updated;
  }
}

export const postgresStore = new PostgresStore();
