import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Product,
  ProductStatus,
  Article,
  ArticleStatus,
  Order,
  OrderStatus,
  AnalyticsEvent,
  StoreSettings,
  DashboardStats,
  AnalyticsSummary,
  AnalyticsTimeRange
} from '../src/types';
import { FileStorageService } from './fileStorage';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer';
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEventRecord {
  id: string;
  event: string;
  receivedAt: string;
  orderId?: string;
}

export interface DatabaseSchema {
  products: Product[];
  articles?: Article[];
  orders: Order[];
  events: AnalyticsEvent[];
  settings: StoreSettings;
  customers?: CustomerRecord[];
  webhookEvents?: WebhookEventRecord[];
}

const INITIAL_PRODUCTS: Product[] = [];

const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'The Ngalung Atelier',
  storeTagline: 'Handcrafted Notion templates, docs, and spreadsheet systems — built to save you hours.',
  creatorName: 'The Ngalung Atelier',
  creatorBio: 'Dedicated to artisanal digital craftsmanship. We design calm, modular systems and templates that help consultants, founders, and creators work with clarity.',
  creatorAvatar: '',
  supportEmail: 'support@ngalungatelier.com',
  businessName: 'The Ngalung Atelier',
  country: 'India',
  refundPolicySummary: 'Due to the immediate digital delivery of our Notion templates, spreadsheet models, and downloadable files, purchases are generally non-refundable once access has been issued. If you encounter duplicate billing or technical issues, contact our support team for prompt review.',
  refundPolicyText: 'All digital templates, Notion duplication links, spreadsheets, and downloadable documents sold on The Ngalung Atelier are classified as digital goods with immediate access. As such, once an order is confirmed and the access vault link or file is issued, purchases are non-refundable.\n\nExceptions are evaluated on a case-by-case basis for: (1) Duplicate charges for the identical item within a short window, (2) Defective or unresolvable files verified by our technical team, or (3) Payment gateway processing discrepancies. Refund inquiries must be submitted within 7 calendar days of purchase to support@ngalungatelier.com with your Order Number and transaction receipt.',
  upiId: 'ngalung.atelier@upi',
  merchantName: 'The Ngalung Atelier',
  currency: 'INR',
  testMode: true,
  razorpayKeyId: '',
  razorpayKeySecret: '',
  socialLinks: {},
  discountCodes: []
};

function generateInitialOrdersAndEvents(_products: Product[]) {
  return { orders: [] as Order[], events: [] as AnalyticsEvent[] };
}

class DataStore {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Accept an intentionally empty datastore; never reseed product content.
        if (
          parsed &&
          Array.isArray(parsed.products) &&
          Array.isArray(parsed.orders) &&
          Array.isArray(parsed.events) &&
          parsed.settings
        ) {
          if (!parsed.customers) {
            parsed.customers = [];
          }
          if (!parsed.webhookEvents) {
            parsed.webhookEvents = [];
          }
          if (!parsed.articles) {
            parsed.articles = [];
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading DB file, re-initializing:', err);
    }

    const { orders, events } = generateInitialOrdersAndEvents(INITIAL_PRODUCTS);
    const initialDb: DatabaseSchema = {
      products: INITIAL_PRODUCTS,
      articles: [],
      orders: orders,
      events: events,
      settings: INITIAL_SETTINGS,
      customers: [],
      webhookEvents: []
    };

    this.saveData(initialDb);
    return initialDb;
  }

  private saveData(data: DatabaseSchema) {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving DB file:', err);
    }
  }

  // Products
  getProducts(): Product[] {
    return this.data.products;
  }

  getProductBySlug(slug: string): Product | undefined {
    return this.data.products.find(p => p.slug === slug);
  }

  getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id);
  }

  saveProduct(productData: Partial<Product>): Product {
    const isPublished = productData.status
      ? productData.status === 'published'
      : (productData.isPublished !== undefined ? productData.isPublished : true);
    const status: ProductStatus = productData.status || (isPublished ? 'published' : 'draft');

    if (productData.id) {
      const index = this.data.products.findIndex(p => p.id === productData.id);
      if (index !== -1) {
        const existing = this.data.products[index];
        const updated: Product = {
          ...existing,
          ...productData,
          status,
          isPublished,
          updatedAt: new Date().toISOString()
        } as Product;
        this.data.products[index] = updated;
        this.saveData(this.data);
        return updated;
      }
    }

    // Create New Product
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

    this.data.products.unshift(product);
    this.saveData(this.data);
    return product;
  }

  /**
   * Safe deletion check: Checks if product has existing customer paid purchases
   */
  hasPaidPurchases(productIdOrSlug: string): boolean {
    return this.data.orders.some(o => 
      (o.productId === productIdOrSlug || o.productSlug === productIdOrSlug) &&
      o.status === 'paid'
    );
  }

  /**
   * Safe deletion check: Checks if product has existing customer orders (paid or pending)
   */
  hasExistingOrders(productIdOrSlug: string): boolean {
    return this.data.orders.some(o => 
      (o.productId === productIdOrSlug || o.productSlug === productIdOrSlug) &&
      (o.status === 'paid' || o.status === 'pending')
    );
  }

  deleteProduct(idOrSlug: string): { success: boolean; prevented?: boolean; message?: string } {
    // Check if any customer has purchased this product (paid order)
    if (this.hasPaidPurchases(idOrSlug)) {
      return {
        success: false,
        prevented: true,
        message: 'This product has existing customer purchases and cannot be permanently deleted. You can unpublish or archive it instead to remove it from the public storefront while protecting customer access.'
      };
    }

    const targetProduct = this.data.products.find(p => p.id === idOrSlug || p.slug === idOrSlug);
    if (!targetProduct) {
      return { success: false, message: 'Product not found' };
    }

    const initialLen = this.data.products.length;
    this.data.products = this.data.products.filter(p => p.id !== idOrSlug && p.slug !== idOrSlug);

    if (this.data.products.length !== initialLen) {
      // Safe cleanup of private product files without affecting other products
      if (targetProduct.digitalAsset?.storageKey) {
        const key = targetProduct.digitalAsset.storageKey;
        const otherUses = this.data.products.some(p => p.digitalAsset?.storageKey === key);
        if (!otherUses) {
          FileStorageService.deletePrivateFile(key);
        }
      }

      // Also clean up any uncompleted pending orders for this non-purchased deleted product
      this.data.orders = this.data.orders.filter(o => 
        !( (o.productId === targetProduct.id || o.productSlug === targetProduct.slug) && o.status !== 'paid' )
      );

      this.saveData(this.data);
      return { success: true, message: 'Product deleted permanently from catalog' };
    }

    return { success: false, message: 'Product not found' };
  }

  unpublishProduct(idOrSlug: string): { success: boolean; product?: Product; message?: string } {
    const product = this.data.products.find(p => p.id === idOrSlug || p.slug === idOrSlug);
    if (!product) {
      return { success: false, message: 'Product not found' };
    }
    product.isPublished = false;
    product.status = 'draft';
    product.updatedAt = new Date().toISOString();
    this.saveData(this.data);
    return { success: true, product, message: 'Product unpublished and set to Draft' };
  }

  archiveProduct(idOrSlug: string): { success: boolean; product?: Product; message?: string } {
    const product = this.data.products.find(p => p.id === idOrSlug || p.slug === idOrSlug);
    if (!product) {
      return { success: false, message: 'Product not found' };
    }
    product.isPublished = false;
    product.status = 'archived';
    product.updatedAt = new Date().toISOString();
    this.saveData(this.data);
    return { success: true, product, message: 'Product archived successfully. Customer licenses remain active.' };
  }

  publishProduct(idOrSlug: string): { success: boolean; product?: Product; message?: string } {
    const product = this.data.products.find(p => p.id === idOrSlug || p.slug === idOrSlug);
    if (!product) {
      return { success: false, message: 'Product not found' };
    }
    product.isPublished = true;
    product.status = 'published';
    product.updatedAt = new Date().toISOString();
    this.saveData(this.data);
    return { success: true, product, message: 'Product published to storefront' };
  }

  resetCatalogToDefaults(): Product[] {
    this.data.products = [...INITIAL_PRODUCTS];
    this.saveData(this.data);
    return this.data.products;
  }

  // Articles
  getArticles(includePrivate = false): Article[] {
    const articles = this.data.articles || [];
    const visible = includePrivate ? articles : articles.filter(a => a.status === 'published');
    return [...visible].sort((a, b) => {
      const left = new Date(b.publishedAt || b.updatedAt || b.createdAt).getTime();
      const right = new Date(a.publishedAt || a.updatedAt || a.createdAt).getTime();
      return left - right;
    }).map(article => ({
      ...article,
      views: this.getArticleViews(article.slug)
    }));
  }

  getArticleBySlug(slug: string, includePrivate = false): Article | undefined {
    const article = (this.data.articles || []).find(a => a.slug === slug);
    if (!article) return undefined;
    if (!includePrivate && article.status !== 'published') return undefined;
    return {
      ...article,
      views: this.getArticleViews(article.slug)
    };
  }

  getArticleById(id: string): Article | undefined {
    const article = (this.data.articles || []).find(a => a.id === id);
    if (!article) return undefined;
    return {
      ...article,
      views: this.getArticleViews(article.slug)
    };
  }

  saveArticle(articleData: Partial<Article>): Article {
    if (!this.data.articles) {
      this.data.articles = [];
    }

    const now = new Date().toISOString();
    const status: ArticleStatus = articleData.status || 'draft';
    const baseSlug = this.normalizeArticleSlug(articleData.slug || articleData.title || 'untitled-article');
    const slug = this.ensureUniqueArticleSlug(baseSlug, articleData.id);
    const tags = Array.isArray(articleData.tags)
      ? articleData.tags.map(t => String(t).trim()).filter(Boolean)
      : [];
    const secondaryKeywords = Array.isArray(articleData.secondaryKeywords)
      ? articleData.secondaryKeywords.map(t => String(t).trim()).filter(Boolean)
      : [];

    if (articleData.id) {
      const index = this.data.articles.findIndex(a => a.id === articleData.id);
      if (index !== -1) {
        const existing = this.data.articles[index];
        const shouldSetPublishedAt = status === 'published' && !existing.publishedAt;
        const updated: Article = {
          ...existing,
          ...articleData,
          slug,
          tags,
          secondaryKeywords,
          status,
          publishedAt: shouldSetPublishedAt ? now : (status === 'published' ? articleData.publishedAt || existing.publishedAt : articleData.publishedAt),
          updatedAt: now
        } as Article;
        this.data.articles[index] = updated;
        this.saveData(this.data);
        return updated;
      }
    }

    const article: Article = {
      id: 'art_' + crypto.randomBytes(8).toString('hex'),
      title: articleData.title || 'Untitled Article',
      slug,
      excerpt: articleData.excerpt || '',
      content: articleData.content || '',
      author: articleData.author || 'Ng Kharinghor',
      category: articleData.category || 'Digital Business',
      tags,
      featuredImage: articleData.featuredImage || '',
      featuredImageAlt: articleData.featuredImageAlt || '',
      primaryKeyword: articleData.primaryKeyword || '',
      secondaryKeywords,
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
      publishedAt: status === 'published' ? (articleData.publishedAt || now) : undefined,
      createdAt: now,
      updatedAt: now,
      bookCta: articleData.bookCta
    };

    this.data.articles.unshift(article);
    this.saveData(this.data);
    return article;
  }

  publishArticle(idOrSlug: string): { success: boolean; article?: Article; message?: string } {
    const article = (this.data.articles || []).find(a => a.id === idOrSlug || a.slug === idOrSlug);
    if (!article) return { success: false, message: 'Article not found' };
    article.status = 'published';
    article.publishedAt = article.publishedAt || new Date().toISOString();
    article.updatedAt = new Date().toISOString();
    this.saveData(this.data);
    return { success: true, article, message: 'Article published' };
  }

  unpublishArticle(idOrSlug: string): { success: boolean; article?: Article; message?: string } {
    const article = (this.data.articles || []).find(a => a.id === idOrSlug || a.slug === idOrSlug);
    if (!article) return { success: false, message: 'Article not found' };
    article.status = 'draft';
    article.updatedAt = new Date().toISOString();
    this.saveData(this.data);
    return { success: true, article, message: 'Article moved to draft' };
  }

  archiveArticle(idOrSlug: string): { success: boolean; article?: Article; message?: string } {
    const article = (this.data.articles || []).find(a => a.id === idOrSlug || a.slug === idOrSlug);
    if (!article) return { success: false, message: 'Article not found' };
    article.status = 'archived';
    article.updatedAt = new Date().toISOString();
    this.saveData(this.data);
    return { success: true, article, message: 'Article archived' };
  }

  deleteArticle(idOrSlug: string): { success: boolean; message?: string } {
    const before = (this.data.articles || []).length;
    this.data.articles = (this.data.articles || []).filter(a => a.id !== idOrSlug && a.slug !== idOrSlug);
    if (this.data.articles.length === before) {
      return { success: false, message: 'Article not found' };
    }
    this.saveData(this.data);
    return { success: true, message: 'Article deleted' };
  }

  getRelatedArticles(article: Article, limit = 3): Article[] {
    const tags = new Set((article.tags || []).map(t => t.toLowerCase()));
    return this.getArticles(false)
      .filter(candidate => candidate.id !== article.id)
      .map(candidate => {
        const tagMatches = (candidate.tags || []).filter(t => tags.has(t.toLowerCase())).length;
        const categoryMatch = candidate.category === article.category ? 2 : 0;
        return { article: candidate, score: tagMatches + categoryMatch };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.article);
  }

  getArticleViews(slug: string): number {
    return this.data.events.filter(e => e.path === `/articles/${slug}` || e.articleSlug === slug).length;
  }

  private normalizeArticleSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'untitled-article';
  }

  private ensureUniqueArticleSlug(slug: string, currentId?: string): string {
    let nextSlug = slug;
    let suffix = 2;
    while ((this.data.articles || []).some(a => a.slug === nextSlug && a.id !== currentId)) {
      nextSlug = `${slug}-${suffix}`;
      suffix += 1;
    }
    return nextSlug;
  }

  // Orders
  getOrders(): Order[] {
    return this.data.orders;
  }

  getOrdersByEmail(email: string): Order[] {
    const normalized = email.trim().toLowerCase();
    return this.data.orders.filter(o => o.buyerEmail.toLowerCase() === normalized);
  }

  getOrderByToken(token: string): Order | undefined {
    return this.data.orders.find(o => o.accessToken === token);
  }

  getOrderByAccessToken(token: string): Order | undefined {
    return this.data.orders.find(o => o.accessToken === token);
  }

  getOrderById(id: string): Order | undefined {
    return this.data.orders.find(o => o.id === id);
  }

  getOrderByRazorpayOrderId(rzpOrderId: string): Order | undefined {
    if (!rzpOrderId) return undefined;
    return this.data.orders.find(o => o.razorpayOrderId === rzpOrderId || o.gatewayPaymentId === rzpOrderId);
  }

  getOrderByRazorpayPaymentId(paymentId: string): Order | undefined {
    if (!paymentId) return undefined;
    return this.data.orders.find(o => o.razorpayPaymentId === paymentId || o.gatewayPaymentId === paymentId);
  }

  getOrderByRefundId(refundId: string): Order | undefined {
    if (!refundId) return undefined;
    return this.data.orders.find(o => o.razorpayRefundId === refundId);
  }

  deleteOrder(id: string): boolean {
    const index = this.data.orders.findIndex(o => o.id === id || o.orderNumber === id);
    if (index === -1) return false;

    const order = this.data.orders[index];
    // Decrement sales count if it was a paid order
    if (order.status === 'paid' || order.status === 'partially_refunded') {
      const prod = this.data.products.find(p => p.id === order.productId || p.slug === order.productSlug);
      if (prod && prod.totalSalesCount && prod.totalSalesCount > 0) {
        prod.totalSalesCount -= 1;
      }
    }

    this.data.orders.splice(index, 1);
    this.saveData(this.data);
    return true;
  }

  updateOrderStatus(orderId: string, status: OrderStatus, details?: Partial<Order>): Order | undefined {
    const orderIndex = this.data.orders.findIndex(o => o.id === orderId || o.orderNumber === orderId || o.razorpayOrderId === orderId);
    if (orderIndex === -1) return undefined;

    const order = this.data.orders[orderIndex];
    const previousStatus = order.status;

    // CRITICAL REQUIREMENT: Strict status precedence & protection
    // 1. REFUNDED orders can NEVER be downgraded to paid, pending, failed, or cancelled
    if (previousStatus === 'refunded') {
      if (status !== 'refunded') {
        console.warn(`[DATASTORE SECURITY] Prevented status change of finalized REFUNDED order ${order.orderNumber} to '${status}'.`);
        if (details) {
          const safeDetails = { ...details };
          delete safeDetails.status;
          delete safeDetails.accessToken;
          Object.assign(order, safeDetails);
          this.saveData(this.data);
        }
        return order;
      }
    }

    // 2. PARTIALLY_REFUNDED orders can only become REFUNDED (full refund) or stay PARTIALLY_REFUNDED
    if (previousStatus === 'partially_refunded') {
      if (status !== 'partially_refunded' && status !== 'refunded') {
        console.warn(`[DATASTORE SECURITY] Prevented downgrade of PARTIALLY_REFUNDED order ${order.orderNumber} to '${status}'.`);
        if (details) {
          const safeDetails = { ...details };
          delete safeDetails.status;
          delete safeDetails.accessToken;
          Object.assign(order, safeDetails);
          this.saveData(this.data);
        }
        return order;
      }
    }

    // 3. PAID orders can only transition to PARTIALLY_REFUNDED or REFUNDED
    if (previousStatus === 'paid') {
      if (status !== 'paid' && status !== 'partially_refunded' && status !== 'refunded') {
        console.warn(`[DATASTORE SECURITY] Prevented downgrade of PAID order ${order.orderNumber} to status '${status}'.`);
        if (details) {
          const safeDetails = { ...details };
          delete safeDetails.status;
          delete safeDetails.accessToken;
          Object.assign(order, safeDetails);
          this.saveData(this.data);
        }
        return order;
      }
    }

    order.status = status;

    if (details) {
      // Protect existing accessToken from ever being overwritten
      const safeDetails = { ...details };
      if (order.accessToken && !safeDetails.accessToken) {
        // preserve
      } else if (order.accessToken && safeDetails.accessToken) {
        delete safeDetails.accessToken;
      }
      Object.assign(order, safeDetails);
    }

    // State transition to PAID (Idempotent: only on first transition to paid)
    if (status === 'paid' && previousStatus !== 'paid' && previousStatus !== 'partially_refunded' && previousStatus !== 'refunded') {
      if (!order.paidAt) {
        order.paidAt = new Date().toISOString();
      }

      // Increment product sales count exactly once
      const prod = this.data.products.find(p => p.id === order.productId || p.slug === order.productSlug);
      if (prod) {
        prod.totalSalesCount = (prod.totalSalesCount || 0) + 1;
      }

      // Record purchase event in analytics
      this.data.events.push({
        id: 'evt_' + Math.random().toString(36).substring(2, 9),
        productId: order.productId,
        productSlug: order.productSlug,
        type: 'purchase',
        source: order.utmSource || 'direct',
        path: `/access/${order.accessToken}`,
        amount: order.amount,
        timestamp: order.paidAt
      });
    }

    // State transition to REFUNDED (revoke product sales counter)
    if (status === 'refunded' && (previousStatus === 'paid' || previousStatus === 'partially_refunded')) {
      const prod = this.data.products.find(p => p.id === order.productId || p.slug === order.productSlug);
      if (prod && prod.totalSalesCount && prod.totalSalesCount > 0) {
        prod.totalSalesCount -= 1;
      }
      // If refundAmount is not explicitly set, default to the full order amount
      if (order.refundAmount === undefined || order.refundAmount === null) {
        order.refundAmount = order.amount;
      }
      if (!order.refundStatus) {
        order.refundStatus = 'processed';
      }
      if (!order.refundProcessedAt) {
        order.refundProcessedAt = new Date().toISOString();
      }
    }

    this.saveData(this.data);
    return order;
  }

  // Webhook Event Idempotency Tracking
  hasProcessedWebhookEvent(eventId: string): boolean {
    if (!eventId || typeof eventId !== 'string') return false;
    if (!this.data.webhookEvents) {
      this.data.webhookEvents = [];
      return false;
    }
    return this.data.webhookEvents.some(e => e.id === eventId);
  }

  recordWebhookEvent(eventId: string, eventType: string, orderId?: string): void {
    if (!eventId || typeof eventId !== 'string') return;
    if (!this.data.webhookEvents) {
      this.data.webhookEvents = [];
    }
    if (this.hasProcessedWebhookEvent(eventId)) {
      return;
    }

    this.data.webhookEvents.push({
      id: eventId,
      event: eventType,
      receivedAt: new Date().toISOString(),
      orderId
    });

    // Retain maximum 2000 recent webhook events
    if (this.data.webhookEvents.length > 2000) {
      this.data.webhookEvents = this.data.webhookEvents.slice(-2000);
    }

    this.saveData(this.data);
  }

  recordEmailDelivery(orderId: string, status: 'sent' | 'failed' | 'not_configured', error?: string): Order | undefined {
    const order = this.getOrderById(orderId) || this.getOrderByRazorpayOrderId(orderId);
    if (!order) return undefined;

    order.emailDeliveryStatus = status;
    if (status === 'sent') {
      order.fulfillmentEmailSent = true;
      order.confirmationEmailSentAt = new Date().toISOString();
      order.emailDeliveryError = undefined;
    } else if (status === 'failed') {
      order.emailDeliveryError = error || 'Failed to dispatch email';
    }

    this.saveData(this.data);
    return order;
  }

  createOrder(orderData: Partial<Order>): Order {
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
      discountAmount: orderData.discountAmount,
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

    this.data.orders.unshift(order);

    // If initialized directly as paid (e.g. seeded data)
    if (isPaid) {
      const prod = this.data.products.find(p => p.id === order.productId || p.slug === order.productSlug);
      if (prod) {
        prod.totalSalesCount = (prod.totalSalesCount || 0) + 1;
      }

      this.data.events.push({
        id: 'evt_' + Math.random().toString(36).substring(2, 9),
        productId: order.productId,
        productSlug: order.productSlug,
        type: 'purchase',
        source: order.utmSource || 'direct',
        path: `/access/${token}`,
        amount: order.amount,
        timestamp: now
      });
    }

    this.saveData(this.data);
    return order;
  }

  // Analytics Events
  logEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): AnalyticsEvent {
    const newEvent: AnalyticsEvent = {
      ...event,
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    this.data.events.push(newEvent);
    // Retain maximum 5000 recent events
    if (this.data.events.length > 5000) {
      this.data.events = this.data.events.slice(-5000);
    }
    this.saveData(this.data);
    return newEvent;
  }

  // Settings
  getSettings(): StoreSettings {
    return this.data.settings;
  }

  updateSettings(newSettings: Partial<StoreSettings>): StoreSettings {
    this.data.settings = {
      ...this.data.settings,
      ...newSettings
    };
    this.saveData(this.data);
    return this.data.settings;
  }

  // Dashboard Aggregates
  getAnalyticsSummary(range: AnalyticsTimeRange = '7d', customStart?: string, customEnd?: string): AnalyticsSummary {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOf7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOf30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    let windowStart = startOf7d;
    let windowEnd = now.getTime();
    let dateRangeLabel = 'Last 7 Days';

    if (range === 'today') {
      windowStart = startOfToday;
      dateRangeLabel = 'Today';
    } else if (range === '7d') {
      windowStart = startOf7d;
      dateRangeLabel = 'Last 7 Days';
    } else if (range === '30d') {
      windowStart = startOf30d;
      dateRangeLabel = 'Last 30 Days';
    } else if (range === 'year') {
      windowStart = startOfYear;
      dateRangeLabel = `Year ${now.getFullYear()}`;
    } else if (range === 'all') {
      windowStart = 0;
      dateRangeLabel = 'All Time';
    } else if (range === 'custom' && customStart) {
      windowStart = new Date(customStart).getTime();
      windowEnd = customEnd ? new Date(customEnd).getTime() + (24 * 60 * 60 * 1000 - 1) : now.getTime();
      dateRangeLabel = `${new Date(windowStart).toLocaleDateString()} - ${new Date(windowEnd).toLocaleDateString()}`;
    }

    // Helper: calculate distinct visitors from a list of events
    const getUniqueVisitorsCount = (evts: AnalyticsEvent[]) => {
      const visitorSet = new Set<string>();
      for (const e of evts) {
        if (e.visitorId) {
          visitorSet.add(e.visitorId);
        } else if (e.source || e.path) {
          // Fallback visitor signature based on source and path
          visitorSet.add(`${e.source}_${e.path}_${e.timestamp.slice(0, 10)}`);
        }
      }
      return visitorSet.size;
    };

    // Calculate visitors metrics
    const eventsToday = this.data.events.filter(e => new Date(e.timestamp).getTime() >= startOfToday);
    const events7d = this.data.events.filter(e => new Date(e.timestamp).getTime() >= startOf7d);
    const eventsMonth = this.data.events.filter(e => new Date(e.timestamp).getTime() >= startOfMonth);
    const eventsYear = this.data.events.filter(e => new Date(e.timestamp).getTime() >= startOfYear);
    const eventsPeriod = this.data.events.filter(e => {
      const t = new Date(e.timestamp).getTime();
      return t >= windowStart && t <= windowEnd;
    });

    const visitors = {
      today: getUniqueVisitorsCount(eventsToday),
      last7Days: getUniqueVisitorsCount(events7d),
      currentMonth: getUniqueVisitorsCount(eventsMonth),
      currentYear: getUniqueVisitorsCount(eventsYear),
      allTime: getUniqueVisitorsCount(this.data.events),
      currentPeriodTotal: getUniqueVisitorsCount(eventsPeriod)
    };

    // Activity breakdown helper
    const getActivityCounts = (evts: AnalyticsEvent[]) => ({
      pageViews: evts.filter(e => e.type === 'page_view' || e.type === 'visit').length,
      productViews: evts.filter(e => e.type === 'product_view' || (e.type === 'visit' && Boolean(e.productId))).length,
      buyClicks: evts.filter(e => e.type === 'buy_click' || e.type === 'click').length,
      checkoutStarts: evts.filter(e => e.type === 'checkout_start').length,
      purchases: evts.filter(e => e.type === 'purchase').length
    });

    const activity = {
      ...getActivityCounts(eventsPeriod),
      breakdown: {
        today: getActivityCounts(eventsToday),
        last7Days: getActivityCounts(events7d),
        currentMonth: getActivityCounts(eventsMonth),
        currentYear: getActivityCounts(eventsYear),
        allTime: getActivityCounts(this.data.events)
      }
    };

    // Helper: revenue calculations for orders
    const getOrderGrossAmountINR = (o: Order) => {
      if (o.status !== 'paid' && o.status !== 'partially_refunded' && o.status !== 'refunded') return 0;
      return o.currency === 'USD' ? Math.round(o.amount * 85) : o.amount;
    };

    const getOrderRefundAmountINR = (o: Order) => {
      if (o.status === 'refunded') {
        const raw = o.refundAmount !== undefined ? o.refundAmount : o.amount;
        return o.currency === 'USD' ? Math.round(raw * 85) : raw;
      }
      if (o.status === 'partially_refunded') {
        const raw = o.refundAmount || 0;
        return o.currency === 'USD' ? Math.round(raw * 85) : raw;
      }
      return 0;
    };

    const getOrderNetAmountINR = (o: Order) => {
      const gross = getOrderGrossAmountINR(o);
      const refund = getOrderRefundAmountINR(o);
      return Math.max(0, gross - refund);
    };

    const ordersToday = this.data.orders.filter(o => new Date(o.paidAt || o.createdAt).getTime() >= startOfToday);
    const orders7d = this.data.orders.filter(o => new Date(o.paidAt || o.createdAt).getTime() >= startOf7d);
    const ordersMonth = this.data.orders.filter(o => new Date(o.paidAt || o.createdAt).getTime() >= startOfMonth);
    const ordersYear = this.data.orders.filter(o => new Date(o.paidAt || o.createdAt).getTime() >= startOfYear);
    const ordersPeriod = this.data.orders.filter(o => {
      const t = new Date(o.paidAt || o.createdAt).getTime();
      return t >= windowStart && t <= windowEnd;
    });

    const periodGross = ordersPeriod.reduce((sum, o) => sum + getOrderGrossAmountINR(o), 0);
    const periodRefunds = ordersPeriod.reduce((sum, o) => sum + getOrderRefundAmountINR(o), 0);
    const periodNet = Math.max(0, periodGross - periodRefunds);
    const periodActivePaidCount = ordersPeriod.filter(o => o.status === 'paid' || o.status === 'partially_refunded').length;
    const aovINR = periodActivePaidCount > 0 ? Math.round(periodNet / periodActivePaidCount) : 0;

    const revenue = {
      today: ordersToday.reduce((sum, o) => sum + getOrderNetAmountINR(o), 0),
      weekly: orders7d.reduce((sum, o) => sum + getOrderNetAmountINR(o), 0),
      monthly: ordersMonth.reduce((sum, o) => sum + getOrderNetAmountINR(o), 0),
      yearly: ordersYear.reduce((sum, o) => sum + getOrderNetAmountINR(o), 0),
      allTime: this.data.orders.reduce((sum, o) => sum + getOrderNetAmountINR(o), 0),
      currentPeriodTotal: periodNet,
      totalRevenueINR: periodNet,
      totalRevenueUSD: Math.round(periodNet / 85),
      grossRevenueINR: periodGross,
      refundedRevenueINR: periodRefunds,
      netRevenueINR: periodNet,
      averageOrderValueINR: aovINR,
      currency: 'INR'
    };

    // Order analytics breakdown
    const getOrderStatusCounts = (ords: Order[]) => {
      const paid = ords.filter(o => o.status === 'paid').length;
      const partiallyRefunded = ords.filter(o => o.status === 'partially_refunded').length;
      const refunded = ords.filter(o => o.status === 'refunded').length;
      const pending = ords.filter(o => o.status === 'pending').length;
      const failed = ords.filter(o => o.status === 'failed' || o.status === 'cancelled').length;
      return {
        total: ords.length,
        totalOrders: paid + partiallyRefunded,
        paid,
        pending,
        pendingOrders: pending,
        failed,
        refunded,
        refundedOrders: refunded,
        partiallyRefunded,
        netPaidOrders: paid + partiallyRefunded
      };
    };

    const orders = {
      ...getOrderStatusCounts(ordersPeriod),
      breakdown: {
        today: getOrderStatusCounts(ordersToday),
        week: getOrderStatusCounts(orders7d),
        month: getOrderStatusCounts(ordersMonth),
        year: getOrderStatusCounts(ordersYear)
      }
    };

    // Conversion metrics
    const periodVisitorsCount = visitors.currentPeriodTotal || (activity.pageViews > 0 ? 1 : 0);
    const periodPaidOrdersCount = orders.netPaidOrders || orders.paid;
    const overallConversionRate = periodVisitorsCount > 0
      ? Number(((periodPaidOrdersCount / periodVisitorsCount) * 100).toFixed(2))
      : 0;
    const cartAbandonmentRate = activity.checkoutStarts > 0
      ? Number((Math.max(0, (1 - (periodPaidOrdersCount / activity.checkoutStarts)) * 100)).toFixed(1))
      : 0;

    const conversion = {
      visitors: visitors.currentPeriodTotal,
      productViews: activity.productViews,
      buyClicks: activity.buyClicks,
      checkoutStarts: activity.checkoutStarts,
      purchases: periodPaidOrdersCount,
      overallConversionRate,
      cartAbandonmentRate
    };

    // Product performance
    const topProducts = this.data.products.map(p => {
      const pEvents = eventsPeriod.filter(e => e.productId === p.id || e.productSlug === p.slug);
      const views = pEvents.filter(e => e.type === 'product_view' || e.type === 'visit').length;
      const buyClicks = pEvents.filter(e => e.type === 'buy_click' || e.type === 'click').length;
      
      const pOrders = ordersPeriod.filter(o => (o.productId === p.id || o.productSlug === p.slug) && (o.status === 'paid' || o.status === 'partially_refunded' || o.status === 'refunded'));
      const activeSales = pOrders.filter(o => o.status === 'paid' || o.status === 'partially_refunded').length;
      const grossRev = pOrders.reduce((sum, o) => sum + getOrderGrossAmountINR(o), 0);
      const refRev = pOrders.reduce((sum, o) => sum + getOrderRefundAmountINR(o), 0);
      const netRev = Math.max(0, grossRev - refRev);
      const convRate = views > 0 ? Number(((activeSales / views) * 100).toFixed(2)) : 0;

      return {
        productId: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        views,
        buyClicks,
        salesCount: activeSales,
        revenue: netRev,
        grossRevenue: grossRev,
        refundedRevenue: refRev,
        netRevenue: netRev,
        revenueFormatted: `₹${netRev.toLocaleString('en-IN')}`,
        conversionRate: convRate
      };
    }).sort((a, b) => b.revenue - a.revenue || b.salesCount - a.salesCount);

    // Time series generation (7 to 30 days depending on range)
    const daysCount = range === 'today' ? 1 : (range === '30d' ? 30 : 7);
    const timeSeriesMap: Record<string, { date: string; label: string; visitors: Set<string>; pageViews: number; revenue: number; grossRevenue: number; refunds: number; orders: number }> = {};

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      timeSeriesMap[dateKey] = {
        date: dateKey,
        label,
        visitors: new Set<string>(),
        pageViews: 0,
        revenue: 0,
        grossRevenue: 0,
        refunds: 0,
        orders: 0
      };
    }

    for (const e of this.data.events) {
      const dateKey = e.timestamp.split('T')[0];
      if (timeSeriesMap[dateKey]) {
        if (e.visitorId) timeSeriesMap[dateKey].visitors.add(e.visitorId);
        else timeSeriesMap[dateKey].visitors.add(`${e.source}_${e.path}`);
        if (e.type === 'page_view' || e.type === 'visit') {
          timeSeriesMap[dateKey].pageViews += 1;
        }
      }
    }

    for (const o of this.data.orders) {
      if (o.status === 'paid' || o.status === 'partially_refunded' || o.status === 'refunded') {
        const dateKey = (o.paidAt || o.createdAt).split('T')[0];
        if (timeSeriesMap[dateKey]) {
          const gross = getOrderGrossAmountINR(o);
          const ref = getOrderRefundAmountINR(o);
          timeSeriesMap[dateKey].grossRevenue += gross;
          timeSeriesMap[dateKey].refunds += ref;
          timeSeriesMap[dateKey].revenue += Math.max(0, gross - ref);
          if (o.status === 'paid' || o.status === 'partially_refunded') {
            timeSeriesMap[dateKey].orders += 1;
          }
        }
      }
    }

    const timeSeries = Object.values(timeSeriesMap).map(item => ({
      date: item.date,
      label: item.label,
      visitors: item.visitors.size,
      pageViews: item.pageViews,
      revenue: item.revenue,
      grossRevenue: item.grossRevenue,
      refunds: item.refunds,
      orders: item.orders
    }));

    return {
      timeRange: range,
      dateRangeLabel,
      visitors,
      activity,
      revenue,
      orders,
      conversion,
      topProducts,
      timeSeries
    };
  }

  // Dashboard Aggregates
  getStats(): DashboardStats {
    const grossPaidOrders = this.data.orders.filter(o => o.status === 'paid' || o.status === 'partially_refunded' || o.status === 'refunded');
    
    const totalGrossRevenueINR = grossPaidOrders.reduce((acc, o) => {
      const amt = o.currency === 'USD' ? Math.round(o.amount * 85) : o.amount;
      return acc + amt;
    }, 0);

    const totalRefundsINR = grossPaidOrders.reduce((acc, o) => {
      if (o.status === 'refunded') {
        const raw = o.refundAmount !== undefined ? o.refundAmount : o.amount;
        return acc + (o.currency === 'USD' ? Math.round(raw * 85) : raw);
      }
      if (o.status === 'partially_refunded') {
        const raw = o.refundAmount || 0;
        return acc + (o.currency === 'USD' ? Math.round(raw * 85) : raw);
      }
      return acc;
    }, 0);

    const totalNetRevenueINR = Math.max(0, totalGrossRevenueINR - totalRefundsINR);
    const totalRevenueINR = totalNetRevenueINR;
    const totalRevenueUSD = Math.round(totalNetRevenueINR / 85);

    const grossOrdersCount = grossPaidOrders.length;
    const refundedOrdersCount = this.data.orders.filter(o => o.status === 'refunded').length;
    const netOrdersCount = this.data.orders.filter(o => o.status === 'paid' || o.status === 'partially_refunded').length;
    const totalOrdersCount = netOrdersCount;

    const totalVisits = this.data.events.filter(e => e.type === 'visit').length;
    const totalCheckoutStarts = this.data.events.filter(e => e.type === 'checkout_start').length;

    const overallConversionRate = totalVisits > 0 
      ? Number(((totalOrdersCount / totalVisits) * 100).toFixed(1))
      : 0;

    // Per-product stats
    const productStatsMap: Record<string, { grossRevenue: number; refunded: number; netRevenue: number; sales: number; visits: number }> = {};
    for (const p of this.data.products) {
      productStatsMap[p.id] = { grossRevenue: 0, refunded: 0, netRevenue: 0, sales: 0, visits: 0 };
    }

    for (const o of this.data.orders) {
      if (o.status === 'paid' || o.status === 'partially_refunded' || o.status === 'refunded') {
        const prod = this.data.products.find(p => p.id === o.productId || p.slug === o.productSlug);
        const pId = prod ? prod.id : o.productId;
        if (pId && productStatsMap[pId]) {
          const gross = o.currency === 'USD' ? Math.round(o.amount * 85) : o.amount;
          let ref = 0;
          if (o.status === 'refunded') {
            const raw = o.refundAmount !== undefined ? o.refundAmount : o.amount;
            ref = o.currency === 'USD' ? Math.round(raw * 85) : raw;
          } else if (o.status === 'partially_refunded') {
            const raw = o.refundAmount || 0;
            ref = o.currency === 'USD' ? Math.round(raw * 85) : raw;
          }
          productStatsMap[pId].grossRevenue += gross;
          productStatsMap[pId].refunded += ref;
          productStatsMap[pId].netRevenue += Math.max(0, gross - ref);
          if (o.status === 'paid' || o.status === 'partially_refunded') {
            productStatsMap[pId].sales += 1;
          }
        }
      }
    }

    for (const e of this.data.events) {
      if (e.type === 'visit' && e.productId && productStatsMap[e.productId]) {
        productStatsMap[e.productId].visits += 1;
      }
    }

    const topProducts = this.data.products.map(p => {
      const stats = productStatsMap[p.id] || { grossRevenue: 0, refunded: 0, netRevenue: 0, sales: 0, visits: 0 };
      const convRate = stats.visits > 0 ? Number(((stats.sales / stats.visits) * 100).toFixed(1)) : 0;
      return {
        productId: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        priceINR: p.priceINR,
        revenue: stats.netRevenue,
        revenueINR: stats.netRevenue,
        grossRevenueINR: stats.grossRevenue,
        refundedINR: stats.refunded,
        netRevenueINR: stats.netRevenue,
        salesCount: stats.sales,
        visits: stats.visits,
        conversionRate: convRate
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Source breakdown
    const sourceMap: Record<string, { visits: number; sales: number; revenue: number }> = {
      instagram: { visits: 0, sales: 0, revenue: 0 },
      linkedin: { visits: 0, sales: 0, revenue: 0 },
      twitter: { visits: 0, sales: 0, revenue: 0 },
      youtube: { visits: 0, sales: 0, revenue: 0 },
      newsletter: { visits: 0, sales: 0, revenue: 0 },
      direct: { visits: 0, sales: 0, revenue: 0 }
    };

    for (const e of this.data.events) {
      const src = (e.source || 'direct').toLowerCase();
      if (!sourceMap[src]) sourceMap[src] = { visits: 0, sales: 0, revenue: 0 };
      if (e.type === 'visit') sourceMap[src].visits += 1;
      if (e.type === 'purchase') {
        sourceMap[src].sales += 1;
        sourceMap[src].revenue += e.amount || 0;
      }
    }

    const sourceBreakdown = Object.entries(sourceMap).map(([source, s]) => ({
      source: source.charAt(0).toUpperCase() + source.slice(1),
      visits: s.visits,
      sales: s.sales,
      revenue: s.revenue
    })).sort((a, b) => b.visits - a.visits);

    // Daily revenue (past 7 days)
    const dailyMap: Record<string, { revenue: number; orders: number }> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = { revenue: 0, orders: 0 };
    }

    for (const o of this.data.orders) {
      if (o.status === 'paid' && o.createdAt) {
        const dateStr = o.createdAt.split('T')[0];
        if (dailyMap[dateStr] !== undefined) {
          dailyMap[dateStr].revenue += o.currency === 'USD' ? o.amount * 85 : o.amount;
          dailyMap[dateStr].orders += 1;
        }
      }
    }

    const dailyRevenue = Object.entries(dailyMap).map(([date, item]) => ({
      date,
      revenue: item.revenue,
      orders: item.orders
    }));

    return {
      totalRevenueINR,
      totalRevenueUSD,
      totalOrdersCount,
      totalVisits,
      totalClicks: this.data.events.filter(e => e.type === 'click').length,
      totalCheckoutStarts,
      overallConversionRate,
      recentOrders: this.data.orders.slice(0, 15),
      topProducts,
      productStats: topProducts,
      sourceBreakdown,
      trafficBySource: sourceBreakdown,
      dailyRevenue
    };
  }

  getDashboardStats(): DashboardStats {
    return this.getStats();
  }

  // Customer Management
  getCustomers(): CustomerRecord[] {
    return this.data.customers || [];
  }

  getCustomerById(id: string): CustomerRecord | undefined {
    return (this.data.customers || []).find(c => c.id === id);
  }

  getCustomerByEmail(email: string): CustomerRecord | undefined {
    const normalized = email.trim().toLowerCase();
    return (this.data.customers || []).find(c => c.email.toLowerCase() === normalized);
  }

  createCustomer(name: string, email: string, passwordHash: string): CustomerRecord {
    if (!this.data.customers) {
      this.data.customers = [];
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = this.getCustomerByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const now = new Date().toISOString();
    const customer: CustomerRecord = {
      id: 'cust_' + crypto.randomBytes(8).toString('hex'),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'customer',
      createdAt: now,
      updatedAt: now
    };

    this.data.customers.push(customer);
    this.saveData(this.data);
    return customer;
  }

  updateCustomer(id: string, updates: { name?: string; passwordHash?: string }): CustomerRecord | undefined {
    if (!this.data.customers) return undefined;
    const index = this.data.customers.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    const current = this.data.customers[index];
    const updated: CustomerRecord = {
      ...current,
      name: updates.name ? updates.name.trim() : current.name,
      passwordHash: updates.passwordHash || current.passwordHash,
      updatedAt: new Date().toISOString()
    };

    this.data.customers[index] = updated;
    this.saveData(this.data);
    return updated;
  }

  getOrdersByCustomerId(customerId: string): Order[] {
    return this.data.orders.filter(o => o.customerId === customerId);
  }

  getOrdersByCustomer(customer: { id: string; email: string }): Order[] {
    const normalizedEmail = customer.email.trim().toLowerCase();
    return this.data.orders.filter(o => 
      (Boolean(o.customerId) && o.customerId === customer.id) ||
      (Boolean(o.buyerEmail) && o.buyerEmail.trim().toLowerCase() === normalizedEmail)
    );
  }
}

export const store = new DataStore();
export default store;
