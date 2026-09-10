import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
  BookOpen,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  RefreshCw,
  X,
  Lock,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Menu,
  Sparkles,
  Store,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Product,
  Article,
  ProductAgeGroup,
  ProductGenderTarget,
  ProductLicenseType,
  ProductMetadata,
  ProductSkillLevel,
  ProductStatus,
  Order,
  DashboardStats,
  AnalyticsSummary,
  AnalyticsTimeRange,
  StoreSettings,
  PaymentGatewayStatus,
  AdminUser,
  AdminCustomer
} from '../types';
import {
  fetchDashboardStats,
  fetchAnalyticsSummary,
  fetchProducts,
  fetchAdminArticles,
  saveProduct,
  deleteProduct,
  resetCatalogToDefaults,
  fetchAdminOrders,
  fetchAdminCustomers,
  fetchStoreSettings,
  fetchAdminGatewayStatus,
  checkAdminAuth,
  logoutAdmin,
  uploadCoverImage,
  uploadProductFile
} from '../lib/api';
import { AdminLogin } from './AdminLogin';
import { LogoMark } from './LogoMark';
import { DashboardOverview } from './admin/DashboardOverview';
import { ProductManagement } from './admin/ProductManagement';
import { ArticleManagement } from './admin/ArticleManagement';
import { OrdersManagement } from './admin/OrdersManagement';
import { CustomersManagement } from './admin/CustomersManagement';
import { AnalyticsOverview } from './admin/AnalyticsOverview';
import { SettingsSection } from './admin/SettingsSection';
import { LogoutConfirmationModal } from './ui/LogoutConfirmationModal';

interface AdminDashboardProps {
  onNavigateHome: () => void;
  onPreviewProduct: (slug: string) => void;
  onPreviewArticle: (slug: string) => void;
  initialTab?: AdminTab;
  initialWriteArticle?: boolean;
}

type AdminTab = 'dashboard' | 'products' | 'articles' | 'orders' | 'customers' | 'analytics' | 'settings';

const COMMON_LANGUAGES = [
  'English',
  'Hindi',
  'Nepali',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Arabic',
  'Chinese',
  'Japanese',
  'Korean'
];

const COUNTRY_OPTIONS = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Nepal',
  'Bhutan',
  'Bangladesh',
  'Singapore',
  'United Arab Emirates',
  'Germany',
  'France',
  'Spain',
  'Brazil',
  'Japan',
  'South Korea',
  'Global'
];

const AGE_GROUP_OPTIONS: Array<{ value: ProductAgeGroup; label: string }> = [
  { value: 'kids_0_12', label: 'Kids (0-12)' },
  { value: 'teens_13_17', label: 'Teens (13-17)' },
  { value: 'young_adults_18_24', label: 'Young Adults (18-24)' },
  { value: 'adults_25_54', label: 'Adults (25-54)' },
  { value: 'seniors_55_plus', label: 'Seniors (55+)' },
  { value: 'all_ages', label: 'All Ages' }
];

const GENDER_TARGET_OPTIONS: ProductGenderTarget[] = ['Male', 'Female', 'All', 'Unisex'];
const SKILL_LEVEL_OPTIONS: ProductSkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
const LICENSE_TYPE_OPTIONS: ProductLicenseType[] = ['Personal Use', 'Commercial Use', 'Extended License'];

type MetadataCategoryKind = 'book' | 'video' | 'template' | 'general';

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMetadataCategoryKind(category?: string): MetadataCategoryKind {
  const normalized = String(category || '').trim().toLowerCase();
  if (normalized === 'ebook' || normalized === 'book') return 'book';
  if (normalized === 'course' || normalized === 'video course') return 'video';
  if (normalized === 'template' || normalized.includes('template')) return 'template';
  return 'general';
}

function uniqueTextValues(values: string[] = []): string[] {
  const seen = new Set<string>();
  return values
    .map(value => value.trim())
    .filter(value => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeProductMetadata(
  category: string | undefined,
  existing: Partial<ProductMetadata> | undefined,
  defaultCreatorName: string,
  defaultRegion: string
): ProductMetadata {
  const kind = getMetadataCategoryKind(category);
  const releaseDateOnStore = existing?.releaseDateOnStore || todayDateInputValue();
  const metadata: ProductMetadata = {
    ...existing,
    coAuthors: uniqueTextValues(existing?.coAuthors),
    coInstructors: uniqueTextValues(existing?.coInstructors),
    compatiblePlatforms: uniqueTextValues(existing?.compatiblePlatforms),
    keywords: uniqueTextValues(existing?.keywords),
    ageGroups: existing?.ageGroups?.length ? existing.ageGroups : [],
    genderTarget: existing?.genderTarget || 'All',
    primaryTargetRegion: existing?.primaryTargetRegion || defaultRegion,
    additionalTargetRegions: uniqueTextValues(existing?.additionalTargetRegions),
    language: existing?.language || 'English',
    releaseDateOnStore
  };

  if (kind === 'template') {
    metadata.creatorName = metadata.creatorName || defaultCreatorName;
    metadata.licenseType = metadata.licenseType || 'Personal Use';
  }

  if (kind === 'video') {
    metadata.skillLevel = metadata.skillLevel || 'All Levels';
  }

  return metadata;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateHome,
  onPreviewProduct,
  onPreviewArticle,
  initialTab,
  initialWriteArticle
}) => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<AdminTab>(() => initialTab || 'dashboard');

  // Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<PaymentGatewayStatus | null>(null);
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('7d');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Product Add / Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productFormError, setProductFormError] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [coverPreviewError, setCoverPreviewError] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultMetadataCreator = settings?.creatorName || settings?.storeName || currentUser?.name || 'The Ngalung Atelier';
  const defaultMetadataRegion = settings?.country || 'India';

  const getNormalizedMetadata = (product: Partial<Product>): ProductMetadata =>
    normalizeProductMetadata(product.category, product.productMetadata, defaultMetadataCreator, defaultMetadataRegion);

  const updateProductMetadata = (updates: Partial<ProductMetadata>) => {
    setEditingProduct(current => {
      if (!current) return current;
      return {
        ...current,
        productMetadata: normalizeProductMetadata(
          current.category,
          { ...current.productMetadata, ...updates },
          defaultMetadataCreator,
          defaultMetadataRegion
        )
      };
    });
  };

  const addProductMetadataTag = (
    field: 'coAuthors' | 'coInstructors' | 'compatiblePlatforms' | 'keywords' | 'additionalTargetRegions',
    rawValue: string
  ) => {
    const values = rawValue.split(',').map(value => value.trim()).filter(Boolean);
    if (values.length === 0) return;
    const currentMetadata = editingProduct ? getNormalizedMetadata(editingProduct) : undefined;
    const currentValues = currentMetadata?.[field] || [];
    updateProductMetadata({ [field]: uniqueTextValues([...currentValues, ...values]) } as Partial<ProductMetadata>);
  };

  const removeProductMetadataTag = (
    field: 'coAuthors' | 'coInstructors' | 'compatiblePlatforms' | 'keywords' | 'additionalTargetRegions',
    value: string
  ) => {
    const currentMetadata = editingProduct ? getNormalizedMetadata(editingProduct) : undefined;
    updateProductMetadata({
      [field]: (currentMetadata?.[field] || []).filter(item => item !== value)
    } as Partial<ProductMetadata>);
  };

  const toggleAgeGroup = (ageGroup: ProductAgeGroup) => {
    const metadata = editingProduct ? getNormalizedMetadata(editingProduct) : undefined;
    const selected = metadata?.ageGroups || [];
    const next = ageGroup === 'all_ages'
      ? ['all_ages']
      : selected.includes(ageGroup)
      ? selected.filter(value => value !== ageGroup)
      : [...selected.filter(value => value !== 'all_ages'), ageGroup];
    updateProductMetadata({ ageGroups: next as ProductAgeGroup[] });
  };

  const getProductMetadataValidationMessage = (product: Partial<Product>): string | null => {
    const metadata = getNormalizedMetadata(product);
    const kind = getMetadataCategoryKind(product.category);

    if (kind === 'book' && !metadata.authorName?.trim()) {
      return 'Author Name is required for Ebook and Book products.';
    }

    if (kind === 'video' && !metadata.instructorName?.trim()) {
      return 'Instructor Name is required for Video Course products.';
    }

    if (kind === 'template' && !metadata.creatorName?.trim()) {
      return 'Creator Name is required for Template products.';
    }

    if (!metadata.primaryTargetRegion?.trim()) {
      return 'Primary Target Region is required.';
    }

    if ((metadata.keywords || []).length < 7) {
      return `Add at least 7 keywords (currently ${(metadata.keywords || []).length}/7) to help this product get discovered.`;
    }

    return null;
  };

  // Check auth session on mount
  useEffect(() => {
    async function verifySession() {
      setIsCheckingAuth(true);
      try {
        const user = await checkAdminAuth();
        if (user) {
          setCurrentUser(user);
          loadAllData();
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Session verification failed:', err);
        setCurrentUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    verifySession();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const loadAllData = async () => {
    setLoading(true);
    setActionError('');
    try {
      const [dashStats, summ, prods, arts, ords, custs, setts, gway] = await Promise.all([
        fetchDashboardStats(),
        fetchAnalyticsSummary(timeRange).catch(() => null),
        fetchProducts(true),
        fetchAdminArticles().catch(() => []),
        fetchAdminOrders(),
        fetchAdminCustomers().catch(() => []),
        fetchStoreSettings(),
        fetchAdminGatewayStatus().then(r => r.gateway).catch(() => null)
      ]);
      setStats(dashStats);
      if (summ) setSummary(summ);
      setProducts(prods);
      setArticles(arts);
      setOrders(ords);
      setCustomers(custs);
      setSettings(setts);
      if (gway) setGatewayStatus(gway);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      if (err.message?.includes('Unauthorized') || err.message?.includes('401')) {
        setCurrentUser(null);
      } else {
        setActionError(err.message || 'Failed to load some admin data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = async (range: AnalyticsTimeRange, start?: string, end?: string) => {
    setTimeRange(range);
    try {
      const summ = await fetchAnalyticsSummary(range, start, end);
      setSummary(summ);
    } catch (err: any) {
      console.error('Failed to update analytics range:', err);
    }
  };

  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUser(user);
    loadAllData();
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUser(null);
      setStats(null);
      setSummary(null);
      setProducts([]);
      setArticles([]);
      setOrders([]);
      setCustomers([]);
      setSettings(null);
    }
  };

  // Product Add Action Handler
  const handleAddNewProduct = () => {
    setCoverPreviewError(false);
    setEditingProduct({
      title: '',
      tagline: '',
      description: '',
      category: 'Template',
      priceINR: 999,
      priceUSD: 15,
      originalPriceINR: 1999,
      originalPriceUSD: 29,
      coverImage: '',
      features: [],
      isPublished: false,
      status: 'draft',
      featured: false,
      totalSalesCount: 0,
      ratingAverage: 5.0,
      ratingCount: 1,
      digitalAsset: {
        type: 'file_download',
        primaryUrl: '',
        accessInstructions: ''
      },
      productMetadata: normalizeProductMetadata('Template', undefined, defaultMetadataCreator, defaultMetadataRegion)
    });
    setProductFormError('');
  };

  // Cover Image File Upload Handler
  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    setUploadError('');
    try {
      const res = await uploadCoverImage(file);
      setCoverPreviewError(false);
      setEditingProduct(current => {
        if (!current) return current;
        return {
          ...current,
          coverImage: res.url
        };
      });
      setActionMessage('Cover image uploaded successfully.');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload cover image');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Digital Product File Upload Handler (Private Secure Vault)
  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setUploadError('');
    try {
      const metadata = await uploadProductFile(file);
      setEditingProduct(current => {
        if (!current) return current;
        return {
          ...current,
          digitalAsset: {
            type: 'file_download',
            primaryUrl: '',
            fileId: metadata.fileId,
            fileName: metadata.fileName,
            fileSize: metadata.fileSize,
            fileSizeBytes: metadata.fileSizeBytes,
            mimeType: metadata.mimeType,
            storageKey: metadata.storageKey,
            storageProvider: metadata.storageProvider,
            checksumSha256: metadata.checksumSha256,
            uploadedAt: metadata.uploadedAt,
            accessInstructions: current.digitalAsset?.accessInstructions || 'Click the download button to access your digital assets.'
          }
        };
      });
      setActionMessage(`Digital asset "${metadata.fileName}" uploaded to private vault.`);
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload product file');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderMetadataTagInput = (
    label: string,
    field: 'coAuthors' | 'coInstructors' | 'compatiblePlatforms' | 'keywords' | 'additionalTargetRegions',
    placeholder: string,
    helperText?: string,
    options?: string[],
    requiredCount?: number
  ) => {
    if (!editingProduct) return null;
    const metadata = getNormalizedMetadata(editingProduct);
    const values = metadata[field] || [];
    const inputListId = options ? `${field}-metadata-options` : undefined;

    return (
      <div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <label className="block font-bold text-slate-700">{label}</label>
          {requiredCount && (
            <span className={`text-[10px] font-bold ${values.length >= requiredCount ? 'text-emerald-700' : 'text-red-600'}`}>
              {values.length}/{requiredCount} required
            </span>
          )}
        </div>
        <div className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500">
          <div className="flex flex-wrap items-center gap-1.5">
            {values.map(value => (
              <span
                key={value}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-900 px-2 py-1 text-[11px] font-bold text-white"
              >
                <span className="truncate">{value}</span>
                <button
                  type="button"
                  onClick={() => removeProductMetadataTag(field, value)}
                  className="rounded-full text-slate-300 hover:text-white"
                  title={`Remove ${value}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              list={inputListId}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault();
                  const input = event.currentTarget;
                  addProductMetadataTag(field, input.value);
                  input.value = '';
                }
              }}
              onBlur={event => {
                const input = event.currentTarget;
                addProductMetadataTag(field, input.value);
                input.value = '';
              }}
              className="min-w-[180px] flex-1 border-0 bg-transparent px-1 py-1 text-xs text-slate-800 outline-none placeholder:text-slate-400"
              placeholder={values.length ? 'Add another...' : placeholder}
            />
            {options && (
              <datalist id={inputListId}>
                {options.map(option => <option key={option} value={option} />)}
              </datalist>
            )}
          </div>
        </div>
        {helperText && <p className="mt-1 text-[11px] text-slate-500">{helperText}</p>}
      </div>
    );
  };

  // Product Form Save
  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.title || !editingProduct?.priceINR) {
      setProductFormError('Title and Price in INR are required');
      return;
    }

    if (Number(editingProduct.priceINR) <= 0) {
      setProductFormError('Price in INR must be greater than 0');
      return;
    }

    const normalizedMetadata = getNormalizedMetadata(editingProduct);
    const metadataError = getProductMetadataValidationMessage({
      ...editingProduct,
      productMetadata: normalizedMetadata
    });
    if (metadataError) {
      setProductFormError(metadataError);
      return;
    }

    setIsSavingProduct(true);
    setProductFormError('');
    try {
      const saved = await saveProduct({
        ...editingProduct,
        productMetadata: normalizedMetadata
      });
      setEditingProduct(null);
      setActionMessage(`Product "${saved.title}" saved successfully.`);
      setTimeout(() => setActionMessage(''), 3000);
      loadAllData();
    } catch (err: any) {
      setProductFormError(err.message || 'Failed to save product');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Reset Catalog
  const handleResetCatalog = async () => {
    if (!window.confirm('Reset all products to factory templates? Any custom additions will be restored to defaults.')) return;
    try {
      const prods = await resetCatalogToDefaults();
      setProducts(prods);
      setActionMessage('Catalog reset to initial defaults.');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to reset catalog');
    }
  };

  // If checking authentication, show clean spinner
  if (isCheckingAuth) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-800" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Verifying Administrator Authorization...
          </span>
        </div>
      </div>
    );
  }

  // If NOT authenticated, render the secure AdminLogin gate
  if (!currentUser) {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onNavigateHome={onNavigateHome}
      />
    );
  }

  return (
    <div id="admin-control-center" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Administration Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Store Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs font-bold text-base">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white">
                  {settings?.storeName || 'ATELIER'} Control Center
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Logged in as <span className="text-slate-200 font-mono">{currentUser.email}</span>
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onNavigateHome}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
            >
              <Store className="w-3.5 h-3.5" />
              <span>View Storefront</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>

            <button
              id="admin-refresh-all-btn"
              onClick={loadAllData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
              title="Refresh All Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Refresh Data</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className={`w-full shrink-0 transition-all ${sidebarCollapsed ? 'md:w-18' : 'md:w-60'}`}>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 shadow-sm sticky top-24 space-y-1">
            <div className="flex items-center justify-between px-2 py-2">
              {!sidebarCollapsed && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Store Management
                </span>
              )}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(value => !value)}
                className="hidden h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:flex"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>

            <button
              id="admin-nav-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </button>

            <button
              id="admin-nav-products"
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'products'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4" />
                {!sidebarCollapsed && <span>Products</span>}
              </div>
              {!sidebarCollapsed && <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'products' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {products.length}
              </span>}
            </button>

            <button
              id="admin-nav-articles"
              onClick={() => setActiveTab('articles')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'articles'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4" />
                {!sidebarCollapsed && <span>Articles</span>}
              </div>
              {!sidebarCollapsed && <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'articles' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {articles.length}
              </span>}
            </button>

            <button
              id="admin-nav-orders"
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'orders'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-4 h-4" />
                {!sidebarCollapsed && <span>Orders</span>}
              </div>
              {!sidebarCollapsed && <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'orders' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {orders.length}
              </span>}
            </button>

            <button
              id="admin-nav-customers"
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'customers'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                {!sidebarCollapsed && <span>Customers</span>}
              </div>
              {!sidebarCollapsed && <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'customers' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {customers.length}
              </span>}
            </button>

            {!sidebarCollapsed && <div className="pt-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100">
              Analytics & Settings
            </div>}

            <button
              id="admin-nav-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {!sidebarCollapsed && <span>Analytics</span>}
            </button>

            <button
              id="admin-nav-settings"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              {!sidebarCollapsed && <span>Settings</span>}
            </button>

            <button
              id="admin-sidebar-logout-btn"
              onClick={() => setConfirmLogout(true)}
              className={`mt-3 w-full flex items-center gap-3 border-t border-slate-100 px-3 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 ${sidebarCollapsed ? 'justify-center rounded-xl' : 'rounded-xl'}`}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Notifications / Feedback */}
          {actionMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionMessage}</span>
              </div>
              <button onClick={() => setActionMessage('')} className="text-emerald-600 hover:text-emerald-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {actionError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{actionError}</span>
              </div>
              <button onClick={() => setActionError('')} className="text-red-600 hover:text-red-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: DASHBOARD HOME OVERVIEW */}
          {activeTab === 'dashboard' && (
            <DashboardOverview
              stats={stats}
              summary={summary}
              products={products}
              orders={orders}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
              onNavigateTab={tab => setActiveTab(tab)}
              onAddNewProduct={handleAddNewProduct}
              onPreviewProduct={onPreviewProduct}
            />
          )}

          {/* TAB 2: PRODUCT MANAGEMENT & CATALOG */}
          {activeTab === 'products' && (
            <ProductManagement
              products={products}
              onRefreshProducts={loadAllData}
              onEditProduct={p => {
                setCoverPreviewError(false);
                setEditingProduct({
                  ...p,
                  productMetadata: normalizeProductMetadata(p.category, p.productMetadata, defaultMetadataCreator, defaultMetadataRegion)
                });
                setProductFormError('');
                setUploadError('');
              }}
              onAddNewProduct={handleAddNewProduct}
              onPreviewProduct={onPreviewProduct}
              onRestoreDefaults={handleResetCatalog}
            />
          )}

          {/* TAB 3: ARTICLE MANAGEMENT & SEO */}
          {activeTab === 'articles' && (
            <ArticleManagement
              articles={articles}
              onRefreshArticles={loadAllData}
              onPreviewPublicArticle={onPreviewArticle}
              autoOpenWriter={initialWriteArticle}
            />
          )}

          {/* TAB 4: ORDERS CRM */}
          {activeTab === 'orders' && (
            <OrdersManagement
              orders={orders}
              onRefreshOrders={loadAllData}
            />
          )}

          {/* TAB 5: CUSTOMERS CRM */}
          {activeTab === 'customers' && (
            <CustomersManagement
              customers={customers}
              onRefreshCustomers={loadAllData}
            />
          )}

          {/* TAB 6: ANALYTICS & FUNNELS */}
          {activeTab === 'analytics' && (
            <AnalyticsOverview
              initialStats={stats}
              onPreviewProduct={onPreviewProduct}
            />
          )}

          {/* TAB 7: STORE SETTINGS & RAZORPAY */}
          {activeTab === 'settings' && settings && (
            <SettingsSection
              settings={settings}
              gatewayStatus={gatewayStatus}
              onRefreshSettings={loadAllData}
            />
          )}
        </main>
      </div>

      {/* Global Add / Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-900">
                {editingProduct.id ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProductForm} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {productFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{productFormError}</span>
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Title & Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Product Title *</label>
                  <input
                    type="text"
                    value={editingProduct.title || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Creator OS 2026"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Tagline / Subheading</label>
                  <input
                    type="text"
                    value={editingProduct.tagline || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, tagline: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. All-in-one digital operating system for modern creators"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingProduct.category || 'Template'}
                    onChange={e => {
                      const category = e.target.value as Product['category'];
                      setEditingProduct({
                        ...editingProduct,
                        category,
                        productMetadata: normalizeProductMetadata(
                          category,
                          editingProduct.productMetadata,
                          defaultMetadataCreator,
                          defaultMetadataRegion
                        )
                      });
                    }}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="Template">Template</option>
                    <option value="Ebook">Ebook</option>
                    <option value="Book">Book</option>
                    <option value="Audio / Sample Pack">Audio / Sample Pack</option>
                    <option value="Preset Pack">Preset Pack</option>
                    <option value="Design Asset">Design Asset</option>
                    <option value="Code Template">Code Template</option>
                    <option value="Video Course">Video Course</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price in INR (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editingProduct.priceINR || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, priceINR: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                    placeholder="999"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Original / Strikethrough Price (INR)</label>
                  <input
                    type="number"
                    value={editingProduct.originalPriceINR || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, originalPriceINR: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="1999"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={
                      editingProduct.status === 'archived'
                        ? 'archived'
                        : editingProduct.status === 'published' || editingProduct.isPublished
                        ? 'published'
                        : 'draft'
                    }
                    onChange={e => {
                      const val = e.target.value;
                      setEditingProduct({
                        ...editingProduct,
                        status: val as ProductStatus,
                        isPublished: val === 'published',
                      });
                    }}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-bold"
                  >
                    <option value="published">Published (Visible to Store Visitors)</option>
                    <option value="draft">Draft (Hidden from Store)</option>
                    <option value="archived">Archived (Purchases Protected, Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Detailed product features and deliverables..."
                />
              </div>

              {/* Product Metadata */}
              {(() => {
                const metadata = getNormalizedMetadata(editingProduct);
                const kind = getMetadataCategoryKind(editingProduct.category);

                return (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                    <div>
                      <label className="block font-bold text-slate-700">Product Metadata</label>
                    </div>

                    {kind === 'book' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Author Name *</label>
                          <input
                            type="text"
                            value={metadata.authorName || ''}
                            onChange={e => updateProductMetadata({ authorName: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            placeholder="e.g. Ngalung Atelier"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Publisher</label>
                          <input
                            type="text"
                            value={metadata.publisher || ''}
                            onChange={e => updateProductMetadata({ publisher: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            placeholder="e.g. The Ngalung Atelier"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          {renderMetadataTagInput('Co-Author(s)', 'coAuthors', 'Type a name, then press Enter')}
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Date of Original Publish</label>
                          <input
                            type="date"
                            value={metadata.originalPublishDate || ''}
                            onChange={e => updateProductMetadata({ originalPublishDate: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Release Date on Store</label>
                          <input
                            type="date"
                            value={metadata.releaseDateOnStore || todayDateInputValue()}
                            onChange={e => updateProductMetadata({ releaseDateOnStore: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Language</label>
                          <input
                            type="text"
                            list="product-language-options"
                            value={metadata.language || 'English'}
                            onChange={e => updateProductMetadata({ language: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            placeholder="English"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Page Count</label>
                          <input
                            type="number"
                            min="1"
                            value={metadata.pageCount || ''}
                            onChange={e => updateProductMetadata({ pageCount: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            placeholder="120"
                          />
                        </div>
                      </div>
                    )}

                    {kind === 'video' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Instructor Name *</label>
                          <input
                            type="text"
                            value={metadata.instructorName || ''}
                            onChange={e => updateProductMetadata({ instructorName: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            placeholder="e.g. Lead instructor"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Total Duration</label>
                          <input
                            type="text"
                            value={metadata.totalDuration || ''}
                            onChange={e => updateProductMetadata({ totalDuration: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            placeholder="e.g. 4h 30m"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          {renderMetadataTagInput('Co-Instructor(s)', 'coInstructors', 'Type a name, then press Enter')}
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Number of Lessons/Modules</label>
                          <input
                            type="number"
                            min="1"
                            value={metadata.lessonCount || ''}
                            onChange={e => updateProductMetadata({ lessonCount: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            placeholder="12"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Skill Level</label>
                          <select
                            value={metadata.skillLevel || 'All Levels'}
                            onChange={e => updateProductMetadata({ skillLevel: e.target.value as ProductSkillLevel })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                          >
                            {SKILL_LEVEL_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Date of Original Publish</label>
                          <input
                            type="date"
                            value={metadata.originalPublishDate || ''}
                            onChange={e => updateProductMetadata({ originalPublishDate: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Release Date on Store</label>
                          <input
                            type="date"
                            value={metadata.releaseDateOnStore || todayDateInputValue()}
                            onChange={e => updateProductMetadata({ releaseDateOnStore: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block font-bold text-slate-700 mb-1">Language</label>
                          <input
                            type="text"
                            list="product-language-options"
                            value={metadata.language || 'English'}
                            onChange={e => updateProductMetadata({ language: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            placeholder="English"
                          />
                        </div>
                      </div>
                    )}

                    {kind === 'template' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Creator Name *</label>
                          <input
                            type="text"
                            value={metadata.creatorName || ''}
                            onChange={e => updateProductMetadata({ creatorName: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            placeholder="The Ngalung Atelier"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Version Number</label>
                          <input
                            type="text"
                            value={metadata.versionNumber || ''}
                            onChange={e => updateProductMetadata({ versionNumber: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            placeholder="e.g. v1.2"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          {renderMetadataTagInput(
                            'Compatible Software/Platform',
                            'compatiblePlatforms',
                            'Type a platform, then press Enter',
                            undefined,
                            ['Notion', 'Figma', 'Excel', 'Google Sheets', 'Canva', 'Airtable', 'Framer', 'Webflow']
                          )}
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Release Date on Store</label>
                          <input
                            type="date"
                            value={metadata.releaseDateOnStore || todayDateInputValue()}
                            onChange={e => updateProductMetadata({ releaseDateOnStore: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">License Type</label>
                          <select
                            value={metadata.licenseType || 'Personal Use'}
                            onChange={e => updateProductMetadata({ licenseType: e.target.value as ProductLicenseType })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                          >
                            {LICENSE_TYPE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    {kind === 'general' && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3.5 py-3 text-[11px] font-semibold text-slate-500">
                        No category-specific metadata fields are configured for this category yet.
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-4 space-y-4">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Discovery & Targeting
                      </div>

                      {renderMetadataTagInput(
                        'Keywords / Search Tags *',
                        'keywords',
                        'Add keyword and press Enter',
                        'Think like a customer searching for this - include topic, format, skill level, and use-case words.',
                        undefined,
                        7
                      )}

                      {metadata.keywords.length < 7 && (
                        <p className="text-[11px] font-semibold text-red-600">
                          Add at least 7 keywords (currently {metadata.keywords.length}/7) to help this product get discovered.
                        </p>
                      )}

                      {metadata.keywords.length > 20 && (
                        <p className="text-[11px] font-semibold text-amber-700">
                          You have more than 20 keywords. Keep the list focused for cleaner admin search and future SEO generation.
                        </p>
                      )}

                      <div>
                        <label className="block font-bold text-slate-700 mb-2">Age Group</label>
                        <div className="flex flex-wrap gap-2">
                          {AGE_GROUP_OPTIONS.map(option => {
                            const active = metadata.ageGroups.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleAgeGroup(option.value)}
                                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                  active
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-500'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Gender Target</label>
                          <select
                            value={metadata.genderTarget || 'All'}
                            onChange={e => updateProductMetadata({ genderTarget: e.target.value as ProductGenderTarget })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                          >
                            {GENDER_TARGET_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Primary Target Region *</label>
                          <input
                            type="text"
                            list="product-region-options"
                            value={metadata.primaryTargetRegion || ''}
                            onChange={e => updateProductMetadata({ primaryTargetRegion: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            placeholder="India"
                          />
                        </div>
                      </div>

                      {renderMetadataTagInput(
                        'Additional Target Regions',
                        'additionalTargetRegions',
                        'Type a region, then press Enter',
                        'Primary region drives default currency/marketing assumptions. Add more regions if this product is relevant globally.',
                        COUNTRY_OPTIONS
                      )}
                    </div>

                    <datalist id="product-language-options">
                      {COMMON_LANGUAGES.map(language => <option key={language} value={language} />)}
                    </datalist>
                    <datalist id="product-region-options">
                      {COUNTRY_OPTIONS.map(country => <option key={country} value={country} />)}
                    </datalist>
                  </div>
                );
              })()}

              {/* Cover Image Upload */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <label className="block font-bold text-slate-700">Cover Image</label>
                <div className="flex items-center gap-3">
                  {editingProduct.coverImage && !coverPreviewError && (
                    <img
                      src={editingProduct.coverImage}
                      alt="Cover Preview"
                      onError={() => {
                        setCoverPreviewError(true);
                        setUploadError('The cover image was uploaded, but the preview could not be loaded. Check that storage is configured and reachable.');
                      }}
                      className="w-16 h-12 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                  {editingProduct.coverImage && coverPreviewError && (
                    <div className="flex h-12 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-[10px] font-bold text-slate-400">
                      No preview
                    </div>
                  )}
                  <input
                    type="file"
                    ref={coverInputRef}
                    onChange={handleCoverFileUpload}
                    accept="image/*"
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                  />
                  {isUploadingCover && <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />}
                </div>
                {editingProduct.coverImage && (
                  <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                    <span className="truncate">Cover image attached</span>
                    <span className="font-bold">Ready</span>
                  </div>
                )}
              </div>

              {/* Digital Product File Vault Upload */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <label className="block font-bold text-slate-700">Digital Product Vault File</label>
                <p className="text-[11px] text-slate-500">
                  Upload the digital asset file (.zip, .pdf, .epub, .mobi, .json, .fig). The file is stored in a private secure vault and accessible only to verified buyers.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProductFileUpload}
                    accept=".pdf,.zip,.rar,.7z,.tar,.gz,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.md,.epub,.mobi,.mp4,.mov,.avi,.mkv,.mp3,.wav,.png,.jpg,.jpeg,.webp,.svg,.psd,.ai,.fig,.sketch,.json"
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                  />
                  {isUploadingFile && <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />}
                </div>
                {editingProduct.digitalAsset?.fileName && (
                  <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                    <span>Vault Asset: {editingProduct.digitalAsset.fileName} ({editingProduct.digitalAsset.fileSize || 'Attached'})</span>
                    <span className="font-bold">Secured</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct || isUploadingCover || isUploadingFile}
                  className="px-6 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingProduct ? 'Saving Product...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmLogout && (
        <LogoutConfirmationModal
          title="Logout from admin?"
          message="Your administrator session will be closed on this browser."
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => {
            setConfirmLogout(false);
            handleLogout();
          }}
        />
      )}
    </div>
  );
};
