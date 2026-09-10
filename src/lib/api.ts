import {
  Product,
  Article,
  ArticleStatus,
  ArticleReviewStatus,
  ArticleSubmissionConfig,
  ArticleSubmissionEntitlement,
  Order,
  OrderStatus,
  AccessPayload,
  StoreSettings,
  PaymentGatewayStatus,
  PublicStoreInfo,
  DashboardStats,
  AnalyticsSummary,
  AnalyticsTimeRange,
  AdminUser,
  AdminCustomer,
  AdminAuthResponse,
  CustomerUser,
  CustomerOrder,
  CustomerAuthResponse
} from '../types';

const API_BASE = '/api';
const ADMIN_TOKEN_KEY = 'atelier_admin_auth_token';
const CUSTOMER_TOKEN_KEY = 'atelier_customer_auth_token';

async function readUploadResponse(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: text.slice(0, 240)
    };
  }
}

// In-memory token caches for fast access
let cachedToken: string | null = null;
let cachedCustomerToken: string | null = null;

// ==========================================
// CUSTOMER TOKEN & AUTH HELPERS
// ==========================================

export function getCustomerToken(): string | null {
  if (cachedCustomerToken) return cachedCustomerToken;
  try {
    cachedCustomerToken = localStorage.getItem(CUSTOMER_TOKEN_KEY);
  } catch {
    // Fallback if localStorage is inaccessible
  }
  return cachedCustomerToken;
}

export function setCustomerToken(token: string): void {
  cachedCustomerToken = token;
  try {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  } catch {
    // Fallback
  }
}

export function clearCustomerToken(): void {
  cachedCustomerToken = null;
  try {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  } catch {
    // Fallback
  }
}

function getCustomerAuthHeaders(): HeadersInit {
  const token = getCustomerToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-customer-token'] = token;
  }
  return headers;
}

// ==========================================
// CUSTOMER AUTHENTICATION API
// ==========================================

export async function registerCustomer(params: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<CustomerAuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Registration failed');
  }

  if (data.token) {
    setCustomerToken(data.token);
  }

  return data;
}

export async function loginCustomer(email: string, password: string): Promise<CustomerAuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Invalid credentials');
  }

  if (data.token) {
    setCustomerToken(data.token);
  }

  return data;
}

export async function checkCustomerAuth(): Promise<CustomerUser | null> {
  const token = getCustomerToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getCustomerAuthHeaders()
    });

    if (res.status === 401 || res.status === 403) {
      clearCustomerToken();
      return null;
    }

    const data = await res.json();
    if (data.success && data.user) {
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

export async function logoutCustomer(): Promise<void> {
  const token = getCustomerToken();
  if (token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getCustomerAuthHeaders()
      });
    } catch {
      // Best-effort logout
    }
  }
  clearCustomerToken();
}

export async function updateCustomerProfile(name: string): Promise<CustomerUser> {
  const res = await fetch(`${API_BASE}/account`, {
    method: 'PUT',
    headers: getCustomerAuthHeaders(),
    body: JSON.stringify({ name })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to update profile');
  }

  return data.user;
}

export async function changeCustomerPassword(params: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: getCustomerAuthHeaders(),
    body: JSON.stringify(params)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to change password');
  }

  return data;
}

export async function fetchCustomerOrders(): Promise<CustomerOrder[]> {
  const res = await fetch(`${API_BASE}/customer/orders`, {
    headers: getCustomerAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    clearCustomerToken();
    throw new Error('Please sign in to view your account orders.');
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch customer orders');
  }

  return data.orders || [];
}

export async function fetchArticleSubmissionConfig(): Promise<{
  config: ArticleSubmissionConfig;
  payment: { configured: boolean; keyId: string };
}> {
  const res = await fetch(`${API_BASE}/articles/submission/config`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to load article submission settings');
  return {
    config: data.config,
    payment: data.payment || { configured: false, keyId: '' }
  };
}

export async function createArticleSubmissionOrder(): Promise<{
  success: boolean;
  entitlementId: string;
  orderReference: string;
  amountINR: number;
  amount: number;
  currency: 'INR';
  razorpay: {
    orderId: string;
    amount: number;
    currency: 'INR';
    keyId: string;
  };
}> {
  const res = await fetch(`${API_BASE}/articles/submission/create-order`, {
    method: 'POST',
    headers: getCustomerAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to start article submission payment');
  }
  return data;
}

export async function verifyArticleSubmissionPayment(payload: {
  razorpayOrderId?: string;
  razorpay_order_id?: string;
  razorpayPaymentId?: string;
  razorpay_payment_id?: string;
  razorpaySignature?: string;
  razorpay_signature?: string;
}): Promise<{ success: boolean; entitlement: ArticleSubmissionEntitlement; message: string }> {
  const res = await fetch(`${API_BASE}/articles/submission/verify`, {
    method: 'POST',
    headers: getCustomerAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to verify article submission payment');
  }
  return data;
}

export async function fetchCustomerArticles(): Promise<{
  articles: Article[];
  entitlements: ArticleSubmissionEntitlement[];
  config: ArticleSubmissionConfig;
}> {
  const res = await fetch(`${API_BASE}/customer/articles`, {
    headers: getCustomerAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    clearCustomerToken();
    throw new Error('Please sign in to manage your articles.');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to load your articles');
  return {
    articles: data.articles || [],
    entitlements: data.entitlements || [],
    config: data.config
  };
}

export async function saveCustomerArticleDraft(article: Partial<Article>): Promise<Article> {
  const isEdit = Boolean(article.id);
  const res = await fetch(isEdit ? `${API_BASE}/customer/articles/${article.id}` : `${API_BASE}/customer/articles`, {
    method: isEdit ? 'PUT' : 'POST',
    headers: getCustomerAuthHeaders(),
    body: JSON.stringify(article)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to save article draft');
  }
  return data.article;
}

export async function submitCustomerArticle(articleId: string): Promise<{ success: boolean; article: Article; message: string }> {
  const res = await fetch(`${API_BASE}/customer/articles/${articleId}/submit`, {
    method: 'POST',
    headers: getCustomerAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to submit article');
  }
  return data;
}

export function getAdminToken(): string | null {
  if (cachedToken) return cachedToken;
  try {
    cachedToken = sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    // Fallback if storage is inaccessible
  }
  return cachedToken;
}

export function setAdminToken(token: string): void {
  cachedToken = token;
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // Fallback
  }
}

export function clearAdminToken(): void {
  cachedToken = null;
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // Fallback
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-admin-token'] = token;
  }
  return headers;
}

// ==========================================
// ADMIN AUTHENTICATION API
// ==========================================

export async function loginAdmin(email: string, password: string): Promise<AdminAuthResponse> {
  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Authentication failed');
  }

  if (data.token) {
    setAdminToken(data.token);
  }

  return data;
}

export async function checkAdminAuth(): Promise<AdminUser | null> {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/admin/auth/me`, {
      headers: getAuthHeaders()
    });
    
    if (res.status === 401 || res.status === 403) {
      clearAdminToken();
      return null;
    }

    const data = await res.json();
    if (data.success && data.user) {
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await fetch(`${API_BASE}/admin/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch {
    // Ignore network error on logout
  } finally {
    clearAdminToken();
  }
}

// ==========================================
// PUBLIC STOREFRONT API
// ==========================================

export async function fetchPublicStoreInfo(): Promise<PublicStoreInfo> {
  const res = await fetch(`${API_BASE}/store/info`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch store information');
  return data.storeInfo;
}

export async function fetchProducts(admin = false): Promise<Product[]> {
  const url = admin ? `${API_BASE}/admin/products` : `${API_BASE}/products`;
  const res = await fetch(url, {
    headers: admin ? getAuthHeaders() : { 'Content-Type': 'application/json' }
  });
  
  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Admin access required');
  }

  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to fetch products');
  return data.products || [];
}

export async function fetchProductBySlug(slugOrId: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${slugOrId}`);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Product not found');
  return data.product;
}

export async function fetchArticles(params?: { category?: string; search?: string }): Promise<Article[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`${API_BASE}/articles${suffix}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch articles');
  return data.articles || [];
}

export async function fetchArticleBySlug(slug: string): Promise<{ article: Article; relatedArticles: Article[] }> {
  const res = await fetch(`${API_BASE}/articles/${slug}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Article not found');
  return { article: data.article, relatedArticles: data.relatedArticles || [] };
}

export async function fetchPaymentConfig(): Promise<{
  success: boolean;
  configured: boolean;
  provider: string;
  environment: string;
  currency: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/payments/config`);
    if (!res.ok) throw new Error('Failed to fetch payment config');
    return await res.json();
  } catch {
    return {
      success: true,
      configured: false,
      provider: 'Razorpay',
      environment: 'TEST MODE',
      currency: 'INR'
    };
  }
}

export async function fetchAdminGatewayStatus(): Promise<{
  success: boolean;
  gateway: PaymentGatewayStatus;
}> {
  const res = await fetch(`${API_BASE}/admin/payments/razorpay/status`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch gateway diagnostic status');
  return data;
}

export async function testRazorpayConnection(): Promise<{
  success: boolean;
  connected: boolean;
  message: string;
  gateway?: PaymentGatewayStatus;
}> {
  const res = await fetch(`${API_BASE}/admin/payments/razorpay/test-connection`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  return data;
}

export async function createOrder(payload: {
  productId?: string;
  productSlug?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  currency?: 'INR' | 'USD';
  discountCode?: string;
  utmSource?: string;
}): Promise<{
  success: boolean;
  alreadyOwned?: boolean;
  orderId?: string;
  orderNumber?: string;
  accessToken?: string;
  accessUrl?: string;
  message?: string;
  amount?: number;
  amountINR?: number;
  currency?: 'INR' | 'USD';
  keyId?: string;
  product?: {
    id: string;
    title: string;
    category: string;
  };
  order?: {
    id: string;
    orderNumber: string;
    amount: number;
    currency: 'INR' | 'USD';
    productTitle: string;
    buyerEmail: string;
    buyerName: string;
  };
  razorpay?: {
    orderId: string;
    amount: number;
    currency: 'INR' | 'USD';
    keyId: string;
  };
}> {
  const res = await fetch(`${API_BASE}/payments/create-order`, {
    method: 'POST',
    headers: getCustomerAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to create payment order');
  }
  return data;
}

export async function verifyPayment(payload: {
  internalOrderId?: string;
  orderId?: string;
  razorpayOrderId?: string;
  razorpay_order_id?: string;
  razorpayPaymentId?: string;
  razorpay_payment_id?: string;
  razorpaySignature?: string;
  razorpay_signature?: string;
  paymentMethod?: string;
  utrNumber?: string;
  gatewayPaymentId?: string;
}): Promise<{
  success: boolean;
  orderId?: string;
  orderNumber: string;
  paymentId?: string;
  productTitle?: string;
  amount?: number;
  currency?: 'INR' | 'USD';
  paidAt?: string;
  accessToken: string;
  accessUrl: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/payments/verify`, {
    method: 'POST',
    headers: getCustomerAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Failed to verify payment');
  }
  return data;
}

export async function fetchAccessByToken(token: string): Promise<AccessPayload> {
  const res = await fetch(`${API_BASE}/access/${token}`);
  const data = await res.json();
  return data;
}

export async function fetchMyPurchases(email: string): Promise<Array<{
  orderNumber: string;
  productTitle: string;
  productCover: string;
  productCategory: string;
  amount: number;
  currency: 'INR' | 'USD';
  paidAt: string;
  accessToken: string;
  accessUrl: string;
}>> {
  const res = await fetch(`${API_BASE}/my-purchases`, {
    method: 'POST',
    headers: getCustomerAuthHeaders(),
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch purchases');
  return data.orders || [];
}

export async function logAnalyticsEvent(payload: {
  productId?: string;
  productSlug?: string;
  type: 'visit' | 'click' | 'checkout_start' | 'purchase';
  source?: string;
  path?: string;
}): Promise<void> {
  try {
    await fetch(`${API_BASE}/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('Analytics event logging failed:', err);
  }
}

// ==========================================
// PROTECTED ADMIN API CALLS
// ==========================================

export async function uploadCoverImage(file: File): Promise<{ url: string; fileName: string }> {
  const formData = new FormData();
  formData.append('coverImage', file);

  const token = getAdminToken();
  const res = await fetch(`${API_BASE}/admin/upload/cover`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: formData
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await readUploadResponse(res);
  if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to upload cover image');
  return { url: data.url, fileName: data.fileName };
}

export async function uploadProductFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('productFile', file);

  const token = getAdminToken();
  const res = await fetch(`${API_BASE}/admin/upload/product-file`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: formData
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await readUploadResponse(res);
  if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to upload digital product file');
  return data.metadata;
}

export async function saveProduct(product: Partial<Product>): Promise<Product> {
  const isEdit = Boolean(product.id);
  const url = isEdit ? `${API_BASE}/products/${product.id}` : `${API_BASE}/products`;
  const method = isEdit ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(product)
  });
  
  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to save product');
  return data.product;
}

export async function fetchAdminProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/admin/products`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to fetch products');
  return data.products || [];
}

export async function fetchAdminArticles(): Promise<Article[]> {
  const res = await fetch(`${API_BASE}/admin/articles`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch articles');
  return data.articles || [];
}

export async function saveArticle(article: Partial<Article>): Promise<Article> {
  const isEdit = Boolean(article.id);
  const url = isEdit ? `${API_BASE}/admin/articles/${article.id}` : `${API_BASE}/admin/articles`;
  const method = isEdit ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(article)
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || data.error || 'Failed to save article');
  return data.article;
}

async function updateArticleStatus(id: string, status: ArticleStatus): Promise<{ success: boolean; article?: Article; message?: string }> {
  const action = status === 'published' ? 'publish' : status === 'archived' ? 'archive' : 'unpublish';
  const res = await fetch(`${API_BASE}/admin/articles/${id}/${action}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || `Failed to ${action} article`);
  return data;
}

export const publishArticle = (id: string) => updateArticleStatus(id, 'published');
export const unpublishArticle = (id: string) => updateArticleStatus(id, 'draft');
export const archiveArticle = (id: string) => updateArticleStatus(id, 'archived');

export async function reviewArticleAdmin(
  id: string,
  reviewStatus: ArticleReviewStatus,
  feedback?: string
): Promise<{ success: boolean; article?: Article; message?: string }> {
  const res = await fetch(`${API_BASE}/admin/articles/${id}/review`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reviewStatus, feedback })
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update article review');
  return data;
}

export async function scheduleArticleAdmin(
  id: string,
  scheduledAt: string
): Promise<{ success: boolean; article?: Article; message?: string }> {
  const res = await fetch(`${API_BASE}/admin/articles/${id}/schedule`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ scheduledAt })
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to schedule article');
  return data;
}

export async function deleteArticle(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/articles/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to delete article');
  return Boolean(data.success);
}

export async function archiveProduct(id: string): Promise<{ success: boolean; product?: Product; message?: string }> {
  const res = await fetch(`${API_BASE}/admin/products/${id}/archive`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to archive product');
  return data;
}

export async function unpublishProduct(id: string): Promise<{ success: boolean; product?: Product; message?: string }> {
  const res = await fetch(`${API_BASE}/admin/products/${id}/unpublish`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to unpublish product');
  return data;
}

export async function publishProduct(id: string): Promise<{ success: boolean; product?: Product; message?: string }> {
  const res = await fetch(`${API_BASE}/admin/products/${id}/publish`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to publish product');
  return data;
}

export async function deleteProduct(id: string): Promise<{ success: boolean; prevented?: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/admin/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) {
    if (data.prevented) {
      return { success: false, prevented: true, message: data.message };
    }
    throw new Error(data.message || 'Failed to delete product');
  }
  return { success: true, message: data.message };
}

export async function fetchAnalyticsSummary(range: AnalyticsTimeRange = '7d', start?: string, end?: string): Promise<AnalyticsSummary> {
  const params = new URLSearchParams();
  if (range) params.set('range', range);
  if (start) params.set('start', start);
  if (end) params.set('end', end);

  const res = await fetch(`${API_BASE}/admin/analytics/summary?${params.toString()}`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to load analytics summary');
  return data.summary;
}

export async function resetCatalogToDefaults(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/admin/reset-catalog`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to reset catalog');
  return data.products || [];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/analytics/stats`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to load dashboard stats');
  return data.stats;
}

export async function fetchAdminOrders(): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/admin/orders`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to load orders');
  return data.orders || [];
}

export async function updateOrderStatusAdmin(
  orderId: string,
  status: OrderStatus,
  options?: { refundAmount?: number; refundNotes?: any }
): Promise<Order> {
  const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, ...options })
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update order status');
  return data.order;
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to delete order');
  return Boolean(data.success);
}

export async function resendOrderEmail(orderId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/admin/orders/${orderId}/resend-email`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to dispatch email');
  return data.message;
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const res = await fetch(`${API_BASE}/admin/settings`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to load settings');
  return data.settings;
}

export async function updateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  const res = await fetch(`${API_BASE}/admin/settings`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings)
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update settings');
  return data.settings;
}

export async function fetchAdminCustomers(): Promise<AdminCustomer[]> {
  const res = await fetch(`${API_BASE}/admin/customers`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to load customers');
  return data.customers || [];
}

export async function fetchAdminCustomerById(id: string): Promise<AdminCustomer> {
  const res = await fetch(`${API_BASE}/admin/customers/${id}`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('Unauthorized: Please log in as administrator');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to load customer details');
  return data.customer;
}
