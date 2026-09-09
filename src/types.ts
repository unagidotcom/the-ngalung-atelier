export type ProductCategory = 'Course' | 'Ebook' | 'Template' | 'Code' | 'Design' | 'Bundle';

export type DigitalAssetType = 'file_download' | 'notion_template' | 'course_link' | 'license_key' | 'bundle';

export interface ProductModule {
  id: string;
  title: string;
  durationOrPages?: string;
  description?: string;
  items?: string[];
}

export interface ProductTestimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
  metric?: string;
}

export interface ProductFAQ {
  id: string;
  question: string;
  answer: string;
}

export interface BonusItem {
  id: string;
  title: string;
  value: string;
  description: string;
  url?: string;
}

export interface ProductDigitalAsset {
  type: DigitalAssetType;
  primaryUrl: string;
  fileId?: string;
  fileName?: string;
  originalFilename?: string;
  fileSize?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  storageProvider?: 'local' | 'supabase' | 's3' | string;
  storageKey?: string;
  checksumSha256?: string;
  uploadedAt?: string;
  accessInstructions: string;
  licenseKeyPrefix?: string;
  licenseKey?: string;
  bonuses?: BonusItem[];
}

export interface UploadedFileMetadata {
  fileId: string;
  fileName: string;
  originalFilename?: string;
  fileSize: string;
  fileSizeBytes: number;
  mimeType: string;
  storageKey: string;
  storageProvider?: 'local' | 'supabase' | 's3' | string;
  checksumSha256?: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export type ProductStatus = 'published' | 'draft' | 'archived';

export interface Product {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  priceINR: number;
  priceUSD: number;
  originalPriceINR: number;
  originalPriceUSD: number;
  coverImage: string;
  previewImages: string[];
  features: string[];
  modules?: ProductModule[];
  testimonials: ProductTestimonial[];
  faqs: ProductFAQ[];
  digitalAsset: ProductDigitalAsset;
  badge?: string;
  status?: ProductStatus;
  isPublished: boolean;
  featured: boolean;
  totalSalesCount: number;
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';

export type PaymentMethod = 'UPI_QR' | 'UPI_INTENT' | 'CARD' | 'RAZORPAY' | 'STRIPE' | 'TEST_CHECKOUT';

export type EmailDeliveryStatus = 'sent' | 'pending' | 'failed' | 'not_configured';

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  productCover: string;
  productCategory: ProductCategory;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  amount: number;
  currency: 'INR' | 'USD';
  discountCode?: string;
  discountAmount?: number;
  status: OrderStatus;
  accessToken: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  gatewayPaymentId?: string;
  paymentMethod: PaymentMethod;
  utrNumber?: string;
  utmSource?: string;
  // Refund fields
  refundAmount?: number;
  refundCurrency?: 'INR' | 'USD';
  refundStatus?: 'created' | 'processed' | 'failed';
  refundCreatedAt?: string;
  refundProcessedAt?: string;
  razorpayRefundId?: string;
  refundReason?: string;
  refundNotes?: Record<string, any>;
  // Fulfillment & timestamps
  fulfillmentEmailSent?: boolean;
  emailDeliveryStatus?: EmailDeliveryStatus;
  confirmationEmailSentAt?: string;
  emailDeliveryError?: string;
  createdAt: string;
  paidAt?: string;
}

export interface AccessPayload {
  valid: boolean;
  order?: {
    id: string;
    orderNumber: string;
    buyerName: string;
    buyerEmail: string;
    amount: number;
    currency: 'INR' | 'USD';
    paidAt: string;
    productTitle: string;
    productCategory: ProductCategory;
  };
  product?: {
    id: string;
    title: string;
    slug: string;
    coverImage: string;
    digitalAsset: ProductDigitalAsset;
  };
  licenseKey?: string;
  message?: string;
}

export type AnalyticsEventType = 'visit' | 'page_view' | 'product_view' | 'article_view' | 'book_cta_click' | 'buy_click' | 'checkout_start' | 'purchase' | 'click';

export interface AnalyticsEvent {
  id: string;
  visitorId?: string;
  productId?: string;
  productSlug?: string;
  articleId?: string;
  articleSlug?: string;
  type: AnalyticsEventType;
  source: string; // e.g. instagram, linkedin, twitter, direct, etc.
  path: string;
  amount?: number;
  timestamp: string;
}

export type ArticleStatus = 'draft' | 'published' | 'archived';
export type ArticleSource = 'admin' | 'customer';
export type ArticleReviewStatus = 'draft' | 'payment_required' | 'ready_to_submit' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'published' | 'rejected' | 'archived';
export type ArticleEntitlementStatus = 'pending' | 'active' | 'used' | 'revoked' | 'refunded';

export interface ArticleBookCta {
  enabled: boolean;
  coverImage?: string;
  title: string;
  author: string;
  description: string;
  amazonUrl?: string;
  googlePlayUrl?: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  featuredImage: string;
  featuredImageAlt: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  seoTitle: string;
  metaDescription: string;
  canonicalUrl?: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  socialShareTitle?: string;
  socialShareDescription?: string;
  socialShareImage?: string;
  status: ArticleStatus;
  source?: ArticleSource;
  ownerCustomerId?: string;
  ownerCustomerName?: string;
  ownerCustomerEmail?: string;
  reviewStatus?: ArticleReviewStatus;
  reviewFeedback?: string;
  submittedAt?: string;
  reviewedAt?: string;
  scheduledAt?: string;
  entitlementId?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  bookCta?: ArticleBookCta;
  views?: number;
}

export interface ArticleSubmissionEntitlement {
  id: string;
  customerId: string;
  customerEmail: string;
  status: ArticleEntitlementStatus;
  orderReference?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amountINR: number;
  currency: 'INR';
  articleId?: string;
  createdAt: string;
  verifiedAt?: string;
  usedAt?: string;
  revokedAt?: string;
}

export interface ArticleSubmissionConfig {
  enabled: boolean;
  priceINR: number;
  currency: 'INR';
  guidelines: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
}

export interface CustomerPurchasedProduct {
  productId: string;
  productSlug?: string;
  productTitle: string;
  productCategory?: ProductCategory;
  orderId: string;
  orderNumber: string;
  amountINR: number;
  purchaseDate: string;
  status: OrderStatus;
  accessToken: string;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
  purchasesCount: number;
  grossSpentINR: number;
  refundedINR: number;
  totalSpentINR: number; // Net lifetime spend
  purchasedProducts: CustomerPurchasedProduct[];
  allOrders?: Array<{
    id: string;
    orderNumber: string;
    productTitle: string;
    amount: number;
    currency: string;
    status: OrderStatus;
    refundAmount?: number;
    createdAt: string;
    paidAt?: string;
  }>;
}

export interface AdminAuthResponse {
  success: boolean;
  token?: string;
  user?: AdminUser;
  expiresAt?: number;
  message?: string;
  error?: string;
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  role: 'customer';
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  productCover: string;
  productCategory: ProductCategory;
  amount: number;
  currency: 'INR' | 'USD';
  paidAt: string;
  status: OrderStatus;
  accessToken: string;
  accessUrl: string;
  downloadUrl?: string;
  refundAmount?: number;
  refundCurrency?: 'INR' | 'USD';
  refundStatus?: string;
  refundCreatedAt?: string;
  refundProcessedAt?: string;
}

export interface CustomerAuthResponse {
  success: boolean;
  token?: string;
  user?: CustomerUser;
  message?: string;
  error?: string;
}

export interface PublicStoreInfo {
  storeName: string;
  storeTagline: string;
  creatorName: string;
  creatorBio: string;
  creatorAvatar: string;
  currency: 'INR' | 'USD';
  supportEmail?: string;
  businessName?: string;
  country?: string;
  refundPolicySummary?: string;
  socialLinks: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
  };
  discountCodes: Array<{
    code: string;
    discountPercent: number;
    active: boolean;
  }>;
}

export interface PaymentGatewayStatus {
  provider: string;
  environment: string;
  configured: boolean;
  keyIdPresent: boolean;
  keySecretPresent: boolean;
  webhookSecretPresent: boolean;
  keyIdStatus?: 'Configured' | 'Missing';
  keySecretStatus: 'Configured' | 'Not Configured' | 'Missing';
  webhookSecretStatus?: 'Configured' | 'Missing';
  webhookStatus: 'Configured' | 'Not Configured' | 'Missing';
  webhookVerification?: 'Ready' | 'Not Ready';
  configurationStatus: string;
  statusDescription?: string;
  status: string;
  keyId: string;
  webhookConfigured: boolean;
  currency: string;
  webhookEndpoint?: string;
}

export interface EmailServiceStatus {
  provider: string;
  activeProviderKey: string;
  configured: boolean;
  fromAddress: string;
  supportEmail: string;
}

export interface DatabaseDiagnosticStatus {
  configured: boolean;
  status: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR';
  provider: 'PostgreSQL' | 'Local JSON (Dev Fallback)';
  authoritative: 'PostgreSQL' | 'Local JSON';
  error?: string;
  checkedAt: string;
}

export interface StorageDiagnosticStatus {
  configured: boolean;
  status: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR' | 'LOCAL DEVELOPMENT';
  provider: 'Supabase Storage' | 'S3-Compatible Storage' | 'Local Disk (Dev Mode)' | string;
  authoritative: 'Private Object Storage' | 'Local Disk';
  providerKey: 'supabase' | 's3' | 'local';
  bucket?: string;
  endpoint?: string;
  region?: string;
  maxUploadSizeMB: number;
  error?: string;
  checkedAt: string;
}

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  creatorName: string;
  creatorBio: string;
  creatorAvatar: string;
  supportEmail?: string;
  businessName?: string;
  country?: string;
  refundPolicySummary?: string;
  refundPolicyText?: string;
  termsCustomText?: string;
  privacyCustomText?: string;
  upiId: string;
  merchantName: string;
  currency: 'INR' | 'USD';
  testMode: boolean;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  socialLinks: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
  };
  discountCodes: Array<{
    code: string;
    discountPercent: number;
    active: boolean;
  }>;
  articleSubmission?: ArticleSubmissionConfig;
  emailService?: EmailServiceStatus;
  database?: DatabaseDiagnosticStatus;
  storage?: StorageDiagnosticStatus;
}

export interface ProductStatItem {
  productId: string;
  title: string;
  slug?: string;
  category: ProductCategory;
  priceINR?: number;
  revenue: number;
  revenueINR?: number;
  grossRevenueINR?: number;
  refundedINR?: number;
  netRevenueINR?: number;
  salesCount: number;
  visits?: number;
  conversionRate: number;
}

export interface TrafficSourceItem {
  source: string;
  visits: number;
  sales: number;
  revenue: number;
}

export interface DashboardStats {
  totalRevenueINR: number; // Net revenue
  totalRevenueUSD: number;
  totalGrossRevenueINR?: number;
  totalRefundsINR?: number;
  totalNetRevenueINR?: number;
  totalOrdersCount: number;
  grossOrdersCount?: number;
  refundedOrdersCount?: number;
  netOrdersCount?: number;
  totalVisits: number;
  totalClicks: number;
  totalCheckoutStarts: number;
  overallConversionRate: number;
  recentOrders: Order[];
  topProducts: ProductStatItem[];
  productStats?: ProductStatItem[];
  sourceBreakdown: TrafficSourceItem[];
  trafficBySource?: TrafficSourceItem[];
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export type AnalyticsTimeRange = 'today' | '7d' | '30d' | 'year' | 'all' | 'custom';

export interface AnalyticsSummary {
  timeRange: AnalyticsTimeRange;
  dateRangeLabel: string;
  visitors: {
    today: number;
    last7Days: number;
    currentMonth: number;
    currentYear: number;
    allTime: number;
    currentPeriodTotal: number;
    uniqueIPs?: number;
    totalUniqueVisitors?: number;
  };
  activity: {
    pageViews: number;
    productViews: number;
    buyClicks: number;
    checkoutStarts: number;
    checkoutsInitiated?: number;
    purchases: number;
    breakdown: {
      today: { pageViews: number; productViews: number; buyClicks: number; checkoutStarts: number; purchases: number };
      last7Days: { pageViews: number; productViews: number; buyClicks: number; checkoutStarts: number; purchases: number };
      currentMonth: { pageViews: number; productViews: number; buyClicks: number; checkoutStarts: number; purchases: number };
      currentYear: { pageViews: number; productViews: number; buyClicks: number; checkoutStarts: number; purchases: number };
      allTime: { pageViews: number; productViews: number; buyClicks: number; checkoutStarts: number; purchases: number };
    };
  };
  revenue: {
    today: number;
    weekly: number;
    monthly: number;
    yearly: number;
    allTime: number;
    currentPeriodTotal: number;
    totalRevenueINR?: number;
    totalRevenueUSD?: number;
    grossRevenueINR?: number;
    refundedRevenueINR?: number;
    netRevenueINR?: number;
    averageOrderValueINR?: number;
    currency: string;
  };
  orders: {
    total: number;
    totalOrders?: number;
    paid: number;
    pending: number;
    pendingOrders?: number;
    failed: number;
    refunded: number;
    refundedOrders?: number;
    partiallyRefunded?: number;
    netPaidOrders?: number;
    breakdown: {
      today: { total: number; paid: number; pending: number; failed: number; refunded: number };
      week: { total: number; paid: number; pending: number; failed: number; refunded: number };
      month: { total: number; paid: number; pending: number; failed: number; refunded: number };
      year: { total: number; paid: number; pending: number; failed: number; refunded: number };
    };
  };
  conversion: {
    visitors: number;
    productViews: number;
    buyClicks: number;
    checkoutStarts: number;
    purchases: number;
    overallConversionRate: number;
    cartAbandonmentRate?: number;
  };
  topProducts: Array<{
    productId: string;
    title: string;
    slug: string;
    category: ProductCategory;
    views: number;
    buyClicks: number;
    salesCount: number;
    revenue: number;
    grossRevenue?: number;
    refundedRevenue?: number;
    netRevenue?: number;
    revenueFormatted: string;
    conversionRate: number;
  }>;
  timeSeries: Array<{
    date: string;
    label: string;
    visitors: number;
    pageViews: number;
    revenue: number;
    grossRevenue?: number;
    refunds?: number;
    orders: number;
  }>;
}
