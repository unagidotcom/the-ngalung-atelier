import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
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
  Store
} from 'lucide-react';
import {
  Product,
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
import { OrdersManagement } from './admin/OrdersManagement';
import { CustomersManagement } from './admin/CustomersManagement';
import { AnalyticsOverview } from './admin/AnalyticsOverview';
import { SettingsSection } from './admin/SettingsSection';

interface AdminDashboardProps {
  onNavigateHome: () => void;
  onPreviewProduct: (slug: string) => void;
}

type AdminTab = 'dashboard' | 'products' | 'orders' | 'customers' | 'analytics' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateHome,
  onPreviewProduct
}) => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<PaymentGatewayStatus | null>(null);
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('7d');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Product Add / Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productFormError, setProductFormError] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const loadAllData = async () => {
    setLoading(true);
    setActionError('');
    try {
      const [dashStats, summ, prods, ords, custs, setts, gway] = await Promise.all([
        fetchDashboardStats(),
        fetchAnalyticsSummary(timeRange).catch(() => null),
        fetchProducts(true),
        fetchAdminOrders(),
        fetchAdminCustomers().catch(() => []),
        fetchStoreSettings(),
        fetchAdminGatewayStatus().then(r => r.gateway).catch(() => null)
      ]);
      setStats(dashStats);
      if (summ) setSummary(summ);
      setProducts(prods);
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
      setOrders([]);
      setCustomers([]);
      setSettings(null);
    }
  };

  // Product Add Action Handler
  const handleAddNewProduct = () => {
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
      }
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
      if (editingProduct) {
        setEditingProduct({
          ...editingProduct,
          coverImage: res.url
        });
      }
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
      if (editingProduct) {
        setEditingProduct({
          ...editingProduct,
          digitalAsset: {
            type: 'file_download',
            primaryUrl: '',
            fileId: metadata.fileId,
            fileName: metadata.fileName,
            fileSize: metadata.fileSize,
            fileSizeBytes: metadata.fileSizeBytes,
            mimeType: metadata.mimeType,
            storageKey: metadata.storageKey,
            uploadedAt: metadata.uploadedAt,
            accessInstructions: editingProduct.digitalAsset?.accessInstructions || 'Click the download button to access your digital assets.'
          }
        });
      }
      setActionMessage(`Digital asset "${metadata.fileName}" uploaded to private vault.`);
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload product file');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

    setIsSavingProduct(true);
    setProductFormError('');
    try {
      const saved = await saveProduct(editingProduct);
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

            <button
              id="admin-logout-btn"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-red-100 bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-60 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 shadow-sm sticky top-24 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Store Management
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
              <span>Dashboard</span>
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
                <span>Products</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'products' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {products.length}
              </span>
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
                <span>Orders</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'orders' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {orders.length}
              </span>
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
                <span>Customers</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === 'customers' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {customers.length}
              </span>
            </button>

            <div className="pt-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100">
              Analytics & Settings
            </div>

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
              <span>Analytics</span>
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
              <span>Settings</span>
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
                setEditingProduct({ ...p });
                setProductFormError('');
              }}
              onAddNewProduct={handleAddNewProduct}
              onPreviewProduct={onPreviewProduct}
              onRestoreDefaults={handleResetCatalog}
            />
          )}

          {/* TAB 3: ORDERS CRM */}
          {activeTab === 'orders' && (
            <OrdersManagement
              orders={orders}
              onRefreshOrders={loadAllData}
            />
          )}

          {/* TAB 4: CUSTOMERS CRM */}
          {activeTab === 'customers' && (
            <CustomersManagement
              customers={customers}
              onRefreshCustomers={loadAllData}
            />
          )}

          {/* TAB 5: ANALYTICS & FUNNELS */}
          {activeTab === 'analytics' && (
            <AnalyticsOverview
              initialStats={stats}
              onPreviewProduct={onPreviewProduct}
            />
          )}

          {/* TAB 6: STORE SETTINGS & RAZORPAY */}
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
                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="Template">Template</option>
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

              {/* Cover Image Upload */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <label className="block font-bold text-slate-700">Cover Image</label>
                <div className="flex items-center gap-3">
                  {editingProduct.coverImage && (
                    <img
                      src={editingProduct.coverImage}
                      alt="Cover Preview"
                      className="w-16 h-12 object-cover rounded-lg border border-slate-200"
                    />
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
              </div>

              {/* Digital Product File Vault Upload */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <label className="block font-bold text-slate-700">Digital Product Vault File</label>
                <p className="text-[11px] text-slate-500">
                  Upload the digital asset file (.zip, .pdf, .json, .fig). The file is stored in a private secure vault and accessible only to verified buyers.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProductFileUpload}
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
    </div>
  );
};
