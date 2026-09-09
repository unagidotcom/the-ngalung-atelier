import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  CreditCard,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  Lock,
  ExternalLink,
  Globe,
  Mail,
  User,
  Tag,
  Plus,
  Trash2,
  Info,
  Check,
  Database,
  HardDrive,
  FolderLock,
  FileCheck,
  FilePenLine
} from 'lucide-react';
import { StoreSettings, PaymentGatewayStatus } from '../../types';
import { updateStoreSettings, testRazorpayConnection } from '../../lib/api';

interface SettingsSectionProps {
  settings: StoreSettings;
  gatewayStatus: PaymentGatewayStatus | null;
  onRefreshSettings: () => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  settings: initialSettings,
  gatewayStatus,
  onRefreshSettings
}) => {
  const [formData, setFormData] = useState<StoreSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Discount code creation
  const [newCode, setNewCode] = useState('');
  const [newPercent, setNewPercent] = useState<number>(10);

  // Diagnostic Test State
  const [isTestingGateway, setIsTestingGateway] = useState(false);
  const [gatewayTestResult, setGatewayTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      await updateStoreSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      onRefreshSettings();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save store settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestRazorpay = async () => {
    setIsTestingGateway(true);
    setGatewayTestResult(null);
    try {
      const res = await testRazorpayConnection();
      setGatewayTestResult({
        tested: true,
        success: res.connected,
        message: res.message || 'Razorpay connection verified successfully.'
      });
    } catch (err: any) {
      setGatewayTestResult({
        tested: true,
        success: false,
        message: err.message || 'Failed to connect to Razorpay API'
      });
    } finally {
      setIsTestingGateway(false);
    }
  };

  const handleAddDiscountCode = () => {
    if (!newCode.trim()) return;
    const existing = formData.discountCodes || [];
    const updated = [
      ...existing,
      {
        code: newCode.trim().toUpperCase(),
        discountPercent: Number(newPercent),
        active: true
      }
    ];
    setFormData({ ...formData, discountCodes: updated });
    setNewCode('');
  };

  const handleRemoveDiscountCode = (codeToRemove: string) => {
    const updated = (formData.discountCodes || []).filter(c => c.code !== codeToRemove);
    setFormData({ ...formData, discountCodes: updated });
  };

  return (
    <div id="settings-section" className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure your digital storefront branding, payment gateway status, and promotional discount codes.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Store settings have been successfully updated and saved!</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Store Profile Information Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Globe className="w-4 h-4 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">Store Profile & Branding</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Store Name</label>
              <input
                type="text"
                value={formData.storeName || ''}
                onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Creator / Author Name</label>
              <input
                type="text"
                value={formData.creatorName || ''}
                onChange={e => setFormData({ ...formData, creatorName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 focus:bg-white"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Tagline / Subheading</label>
              <input
                type="text"
                value={formData.storeTagline || ''}
                onChange={e => setFormData({ ...formData, storeTagline: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Creator Bio / Description</label>
              <textarea
                rows={3}
                value={formData.creatorBio || ''}
                onChange={e => setFormData({ ...formData, creatorBio: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Default Store Currency</label>
              <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
                  ₹
                </span>
                <span>INR (Indian Rupee) - Primary Authority</span>
              </div>
            </div>
          </div>
        </div>

        {/* Razorpay Payment Gateway Diagnostics & Status Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Razorpay Payment Gateway</h2>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              TEST MODE ACTIVE
            </span>
          </div>

          {/* Diagnostic Status Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            {/* Environment */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Environment</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Sandbox Testing Mode
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                TEST MODE
              </span>
            </div>

            {/* Key ID */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Key ID</div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {gatewayStatus?.keyId && gatewayStatus.keyId !== 'Not Configured' ? gatewayStatus.keyId : 'Missing'}
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                gatewayStatus?.keyIdPresent || (gatewayStatus?.keyId && gatewayStatus.keyId !== 'Not Configured')
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {gatewayStatus?.keyIdPresent || (gatewayStatus?.keyId && gatewayStatus.keyId !== 'Not Configured') ? 'Configured' : 'Missing'}
              </span>
            </div>

            {/* Key Secret */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Key Secret</div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {gatewayStatus?.keySecretPresent || gatewayStatus?.keySecretStatus === 'Configured' ? 'Protected on Server (••••••••••••••••)' : 'Not Set in Environment'}
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                gatewayStatus?.keySecretPresent || gatewayStatus?.keySecretStatus === 'Configured'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}>
                {gatewayStatus?.keySecretPresent || gatewayStatus?.keySecretStatus === 'Configured' ? 'Configured' : 'Missing'}
              </span>
            </div>

            {/* Webhook Secret */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Webhook Secret</div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {gatewayStatus?.webhookSecretPresent || gatewayStatus?.webhookStatus === 'Configured' ? 'Protected on Server (••••••••••••••••)' : 'Not Set (RAZORPAY_WEBHOOK_SECRET)'}
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                gatewayStatus?.webhookSecretPresent || gatewayStatus?.webhookStatus === 'Configured'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {gatewayStatus?.webhookSecretPresent || gatewayStatus?.webhookStatus === 'Configured' ? 'Configured' : 'Missing'}
              </span>
            </div>

            {/* Webhook Endpoint */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Webhook Endpoint</div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  /api/webhooks/razorpay
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                Active
              </span>
            </div>

            {/* Webhook Verification */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Webhook Verification</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  HMAC-SHA256 Raw Signature
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                gatewayStatus?.webhookSecretPresent || gatewayStatus?.webhookStatus === 'Configured'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}>
                {gatewayStatus?.webhookSecretPresent || gatewayStatus?.webhookStatus === 'Configured' ? 'Ready' : 'Not Ready'}
              </span>
            </div>
          </div>

          {/* Test Gateway Connection Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestRazorpay}
              disabled={isTestingGateway}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-500 ${isTestingGateway ? 'animate-spin' : ''}`} />
              <span>{isTestingGateway ? 'Testing Razorpay Connection...' : 'Test Razorpay Connection'}</span>
            </button>

            {gatewayTestResult && (
              <div
                className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
                  gatewayTestResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {gatewayTestResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span>{gatewayTestResult.message}</span>
              </div>
            )}
          </div>

          {/* Security & Confidentiality Notice */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
            <Lock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block">Server-Side Secret Management</span>
              <span>
                Razorpay API secrets and webhook keys are securely stored on the server environment. Secrets are never exposed to the frontend browser, preserving bank-grade security standards.
              </span>
            </div>
          </div>
        </div>

        {/* Paid Article Submission Settings Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FilePenLine className="w-4 h-4 text-[#FF5A36]" />
              <h2 className="text-base font-bold text-slate-900">Paid Customer Article Submissions</h2>
            </div>
            <label className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200">
              <input
                type="checkbox"
                checked={formData.articleSubmission?.enabled ?? true}
                onChange={e => setFormData({
                  ...formData,
                  articleSubmission: {
                    enabled: e.target.checked,
                    priceINR: formData.articleSubmission?.priceINR || 999,
                    currency: 'INR',
                    guidelines: formData.articleSubmission?.guidelines || ''
                  }
                })}
                className="h-4 w-4 accent-emerald-600"
              />
              Enabled
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Price in INR</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  min="1"
                  value={formData.articleSubmission?.priceINR || 999}
                  onChange={e => setFormData({
                    ...formData,
                    articleSubmission: {
                      enabled: formData.articleSubmission?.enabled ?? true,
                      priceINR: Math.max(1, Number(e.target.value || 1)),
                      currency: 'INR',
                      guidelines: formData.articleSubmission?.guidelines || ''
                    }
                  })}
                  className="w-full pl-7 pr-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 focus:bg-white"
                />
              </div>
              <p className="mt-2 text-[11px] leading-4 text-slate-500">The browser price is ignored. This server-side value is used for Razorpay orders.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Submission Guidelines</label>
              <textarea
                rows={4}
                value={formData.articleSubmission?.guidelines || ''}
                onChange={e => setFormData({
                  ...formData,
                  articleSubmission: {
                    enabled: formData.articleSubmission?.enabled ?? true,
                    priceINR: formData.articleSubmission?.priceINR || 999,
                    currency: 'INR',
                    guidelines: e.target.value
                  }
                })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 focus:bg-white"
                placeholder="Explain what kind of articles you accept and what review standards apply."
              />
            </div>
          </div>
        </div>

        {/* Database Infrastructure & Reliability Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-700" />
              <h2 className="text-base font-bold text-slate-900">Database & Data Persistence</h2>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              formData.database?.status === 'CONNECTED'
                ? 'bg-emerald-100 text-emerald-800'
                : formData.database?.status === 'ERROR'
                ? 'bg-red-100 text-red-800'
                : 'bg-slate-100 text-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                formData.database?.status === 'CONNECTED'
                  ? 'bg-emerald-500'
                  : formData.database?.status === 'ERROR'
                  ? 'bg-red-500'
                  : 'bg-slate-400'
              }`} />
              {formData.database?.status === 'CONNECTED'
                ? 'PostgreSQL Connected'
                : formData.database?.status === 'ERROR'
                ? 'PostgreSQL Connection Error'
                : 'Local JSON Datastore (Dev Mode)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Active Storage Provider</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {formData.database?.provider || 'Local JSON (Dev Fallback)'}
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                {formData.database?.authoritative || 'Local JSON'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Production Migrations</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Automated ACID Migrations
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Ready
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">ACID Transactions & Locking</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Row-level Locks on Orders
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Webhook Idempotency Ledger</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Persistent Deduplication
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Protected
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
            <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block">Production Relational Database Deployment</span>
              <span>
                To connect a production PostgreSQL instance, set <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">DATABASE_URL</code> in environment settings. The server automatically validates connectivity, initializes schema tables with SSL, and syncs all transactional state.
              </span>
            </div>
          </div>
        </div>

        {/* Private Digital Product Object Storage Diagnostics Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <FolderLock className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Private Digital Product Object Storage</h2>
                <p className="text-xs text-slate-500">Persistent, private vault storage for high-value digital deliverables</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  initialSettings.storage?.status === 'CONNECTED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : initialSettings.storage?.status === 'LOCAL DEVELOPMENT'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    initialSettings.storage?.status === 'CONNECTED'
                      ? 'bg-emerald-500'
                      : initialSettings.storage?.status === 'LOCAL DEVELOPMENT'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
                {initialSettings.storage?.status || 'LOCAL DEVELOPMENT'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Storage Provider</div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-600" />
                {initialSettings.storage?.provider || 'Local Disk (Dev Mode)'}
              </div>
              <div className="text-xs text-slate-500">
                Authoritative Tier: <span className="font-semibold text-slate-700">{initialSettings.storage?.authoritative || 'Local Disk'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Storage Vault Bucket</div>
              <div className="text-sm font-mono font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                {initialSettings.storage?.bucket || 'private_products (private)'}
              </div>
              <div className="text-xs text-slate-500">
                Max Upload Limit: <span className="font-semibold text-slate-700">{initialSettings.storage?.maxUploadSizeMB || 100} MB</span>
              </div>
            </div>
          </div>

          {/* Storage Security Standards Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Zero Public URLs</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Direct Token Auth Only
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Integrity Checksums</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  SHA-256 Validated
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Enforced
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Refund Revocation</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Real-time Access Cutoff
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Protected
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
            <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block">Production Persistent Object Storage</span>
              <span>
                For production deployments on ephemeral containers, configure either <strong>Supabase Storage</strong> (<code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">SUPABASE_URL</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">SUPABASE_SERVICE_ROLE_KEY</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">SUPABASE_STORAGE_BUCKET</code>) or <strong>S3-Compatible Storage</strong> (<code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">S3_BUCKET</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">S3_ACCESS_KEY_ID</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">S3_SECRET_ACCESS_KEY</code>). Use <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">npm run migrate:storage:dry-run</code> to audit assets before migration.
              </span>
            </div>
          </div>
        </div>

        {/* Promotional Discount Codes Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Tag className="w-4 h-4 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">Promotional Discount Codes</h2>
          </div>

          {/* Add New Discount Code */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="e.g. LAUNCH20"
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              className="px-3.5 py-2 text-xs uppercase font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-40"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="100"
                value={newPercent}
                onChange={e => setNewPercent(Number(e.target.value))}
                className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-20 text-center"
              />
              <span className="text-xs font-bold text-slate-500">% OFF</span>
            </div>
            <button
              type="button"
              onClick={handleAddDiscountCode}
              className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Code</span>
            </button>
          </div>

          {/* Active Codes List */}
          <div className="space-y-2 pt-2">
            {(formData.discountCodes || []).map((codeItem, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {codeItem.code}
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {codeItem.discountPercent}% Discount
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDiscountCode(codeItem.code)}
                  className="text-red-500 hover:text-red-700 p-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {(formData.discountCodes || []).length === 0 && (
              <p className="text-xs text-slate-400 italic">No discount codes configured yet.</p>
            )}
          </div>
        </div>

        {/* Social Media Links Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Globe className="w-4 h-4 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">Social Media & Public Links</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Instagram URL</label>
              <input
                type="url"
                placeholder="https://instagram.com/..."
                value={formData.socialLinks?.instagram || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, instagram: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">YouTube URL</label>
              <input
                type="url"
                placeholder="https://youtube.com/..."
                value={formData.socialLinks?.youtube || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, youtube: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Twitter / X URL</label>
              <input
                type="url"
                placeholder="https://x.com/..."
                value={formData.socialLinks?.twitter || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, twitter: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">LinkedIn URL</label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/..."
                value={formData.socialLinks?.linkedin || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, linkedin: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Store Settings...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
