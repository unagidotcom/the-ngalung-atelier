import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Download, ExternalLink, Key, CheckCircle, Copy, Check, FileText, Printer, AlertTriangle, Sparkles, ArrowLeft } from 'lucide-react';
import { AccessPayload } from '../types';
import { fetchAccessByToken } from '../lib/api';
import { LogoMark } from './LogoMark';

interface DeliveryVaultProps {
  accessToken: string;
  onNavigateHome: () => void;
  onNavigateToProduct?: (slug: string) => void;
}

export const DeliveryVault: React.FC<DeliveryVaultProps> = ({
  accessToken,
  onNavigateHome,
}) => {
  const [loading, setLoading] = useState(true);
  const [accessData, setAccessData] = useState<AccessPayload | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    async function loadAccess() {
      setLoading(true);
      try {
        const data = await fetchAccessByToken(accessToken);
        setAccessData(data);
      } catch (err: any) {
        setAccessData({
          valid: false,
          message: err.message || 'Access verification failed'
        });
      } finally {
        setLoading(false);
      }
    }
    loadAccess();
  }, [accessToken]);

  const handleCopyLicense = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDownloadFile = () => {
    setDownloading(true);
    setDownloadProgress(100);
    window.location.href = `/api/access/${encodeURIComponent(accessToken)}/download`;
    window.setTimeout(() => {
      setDownloading(false);
      setDownloadProgress(0);
    }, 1200);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center bg-[#FAF6EE] text-[#17181F]">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#FFE7DD] text-[#FF5A36] shadow-2xs">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#FF5A36] border-t-transparent" />
        </div>
        <h2 className="mt-4 font-display text-lg font-bold text-[#17181F]">Decrypting Atelier Vault Entry...</h2>
        <p className="mt-1 text-xs font-mono text-[#6E6C63] max-w-sm">
          Checking cryptographic signature and licensing authorization in server records.
        </p>
      </div>
    );
  }

  // Server Gating Blocked State
  if (!accessData?.valid) {
    const isRefunded = accessData?.status === 'refunded';

    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className={`rounded-3xl border ${isRefunded ? 'border-stone-300 bg-stone-50' : 'border-red-200 bg-red-50/50'} p-8 text-center shadow-xs`}>
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${isRefunded ? 'bg-stone-200 text-stone-700' : 'bg-red-100 text-red-600'}`}>
            <Lock className="h-7 w-7" />
          </div>

          <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-[#17181F]">
            {isRefunded ? 'Access Revoked — Order Refunded' : 'Access Gated — Payment Required'}
          </h2>
          <p className="mt-2 text-xs text-[#6E6C63] leading-relaxed max-w-md mx-auto">
            {accessData?.message || (isRefunded 
              ? 'This purchase has been refunded. Digital asset access and license authorization are no longer active.' 
              : 'You do not have authorization to view this digital system vault without a confirmed paid order.')}
          </p>

          <div className="mt-6 rounded-2xl bg-white p-4 border border-[#E7DFCE] text-left text-xs space-y-1.5 text-[#6E6C63]">
            <div className="flex items-center gap-2 font-bold text-[#17181F]">
              <AlertTriangle className={`h-4 w-4 shrink-0 ${isRefunded ? 'text-stone-600' : 'text-red-600'}`} />
              <span>{isRefunded ? 'Refund Policy Notice' : 'Why is this vault locked?'}</span>
            </div>
            <p className="text-[#6E6C63] font-mono text-[11px]">
              {isRefunded 
                ? 'Under our Refund & Cancellation Policy, full refunds permanently terminate digital license validity and vault file access.'
                : 'Our server requires an authenticated paid order token. If you recently paid via UPI, please allow a few moments for banking settlement.'}
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              onClick={onNavigateHome}
              className="w-full sm:w-auto rounded-full bg-[#17181F] px-6 py-2.5 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F] transition-colors cursor-pointer"
            >
              Browse All Systems
            </button>
            {!isRefunded && (
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto rounded-full border border-[#E7DFCE] bg-white px-6 py-2.5 text-xs font-semibold text-[#17181F] hover:bg-[#F3EDE0] transition-colors cursor-pointer"
              >
                Re-verify Status
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { order, product, licenseKey } = accessData;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 bg-[#FAF6EE] text-[#17181F]">
      {/* Celebration Header */}
      <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E7DFCE] pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F8F5F]/10 text-[#1F8F5F] border border-[#1F8F5F]/20">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#1F8F5F]/10 text-[#1F8F5F] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono border border-[#1F8F5F]/20">
                  Verified Order
                </span>
                <span className="text-xs font-mono font-bold text-[#A6A296]">
                  {order?.orderNumber}
                </span>
              </div>
              <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight text-[#17181F]">
                Digital Delivery Vault Unlocked
              </h1>
            </div>
          </div>

          <button
            onClick={() => setShowReceiptModal(true)}
            className="flex items-center gap-2 rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#17181F] shadow-2xs hover:bg-[#F3EDE0] transition-colors cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-[#6E6C63]" />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* Order Meta Ribbon */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div>
            <span className="block text-[10px] uppercase font-mono font-bold text-[#A6A296]">Customer</span>
            <span className="font-semibold text-[#17181F] truncate block">{order?.buyerName || 'Customer'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-mono font-bold text-[#A6A296]">Delivery Email</span>
            <span className="font-semibold text-[#17181F] truncate block">{order?.buyerEmail || '—'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-mono font-bold text-[#A6A296]">Amount Paid</span>
            <span className="font-display font-bold text-[#FF5A36] text-sm">
              {order?.currency === 'USD' ? `$${order?.amount ?? 0}` : `₹${(order?.amount ?? 0).toLocaleString('en-IN')}`}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-mono font-bold text-[#A6A296]">Purchased Date</span>
            <span className="font-mono text-[#6E6C63]">
              {order?.paidAt ? new Date(order.paidAt).toLocaleDateString() : 'Today'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Delivery Asset Section */}
      <div className="mt-6 space-y-5">
        <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E7DFCE] pb-5">
            <div className="flex items-center gap-4">
              <img
                src={product?.coverImage}
                alt={product?.title}
                className="h-14 w-14 rounded-2xl object-cover border border-[#E7DFCE] shrink-0"
              />
              <div>
                <span className="rounded-full bg-[#F3EDE0] px-2.5 py-0.5 text-[10px] font-mono font-semibold text-[#6E6C63] uppercase border border-[#E7DFCE]">
                  {product?.digitalAsset?.type ? product.digitalAsset.type.replace('_', ' ') : 'DIGITAL ASSET'}
                </span>
                <h2 className="mt-1 font-display text-base sm:text-lg font-bold text-[#17181F]">
                  {product?.title}
                </h2>
              </div>
            </div>
          </div>

          {/* Access Instructions */}
          <div className="mt-5 rounded-2xl bg-[#FAF6EE] p-4 border border-[#E7DFCE]">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A6A296] font-mono mb-1">
              System Deployment Guide
            </h3>
            <p className="text-xs sm:text-sm text-[#17181F] leading-relaxed">
              {product?.digitalAsset.accessInstructions || 'Click the primary action button below to access or duplicate your digital workspace immediately.'}
            </p>
          </div>

          {/* Dynamic Asset Delivery Actions */}
          <div className="mt-5 space-y-3.5">
            {/* 1. Notion Template */}
            {product?.digitalAsset.type === 'notion_template' && (
              <div className="rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#FF5A36]" />
                  <span className="font-bold text-xs sm:text-sm text-[#17181F]">1-Click Notion Template Duplicate</span>
                </div>
                <p className="text-xs text-[#6E6C63]">
                  Click below to open Notion and duplicate the master workspace directly into your private account.
                </p>
                <a
                  href={product.digitalAsset.primaryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#17181F] px-6 py-3 text-xs font-bold text-[#FAF6EE] shadow-2xs hover:bg-[#31333F] transition-colors w-full sm:w-auto"
                >
                  <span>Duplicate to Notion Workspace</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* 2. Course Portal Access */}
            {product?.digitalAsset.type === 'course_link' && (
              <div className="rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#FF5A36]" />
                  <span className="font-bold text-xs sm:text-sm text-[#17181F]">Portal & Masterclass Modules</span>
                </div>
                <p className="text-xs text-[#6E6C63]">
                  Your pass is authenticated for <strong className="font-mono text-[#17181F]">{order?.buyerEmail}</strong>. Click below to enter the video walkthroughs and component libraries.
                </p>
                <a
                  href={product.digitalAsset.primaryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FF5A36] px-6 py-3 text-xs font-bold text-[#FFFFFF] shadow-2xs hover:bg-[#E64A27] transition-colors w-full sm:w-auto"
                >
                  <span>Launch Workshop Portal</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* 3. Direct File / Zip Download */}
            {(product?.digitalAsset.type === 'file_download' || product?.digitalAsset.type === 'bundle') && (
              <div className="rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-[#FF5A36]" />
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-[#17181F]">
                        {product.digitalAsset.fileName || 'Digital_Asset_Package.zip'}
                      </span>
                      {product.digitalAsset.fileSize && (
                        <span className="ml-2 text-xs font-mono text-[#6E6C63]">
                          ({product.digitalAsset.fileSize})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {downloading ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-[#6E6C63] font-mono">
                      <span>Downloading package...</span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#E7DFCE] overflow-hidden">
                      <div
                        className="h-full bg-[#FF5A36] transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#17181F] px-6 py-3 text-xs font-bold text-[#FAF6EE] shadow-2xs hover:bg-[#31333F] transition-colors w-full sm:w-auto cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Package (.ZIP)</span>
                  </button>
                )}
              </div>
            )}

            {/* License Key Display */}
            {licenseKey && (
              <div className="rounded-2xl border border-[#E7DFCE] bg-[#FFFFFF] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Key className="h-4 w-4 text-[#F2A93B]" />
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-[#A6A296] block">
                      Assigned License Key
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#17181F]">
                      {licenseKey}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyLicense(licenseKey)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DFCE] bg-[#FAF6EE] px-3 py-1.5 text-xs font-mono font-medium text-[#17181F] hover:bg-[#F3EDE0] cursor-pointer"
                >
                  {copiedKey ? <Check className="h-3.5 w-3.5 text-[#1F8F5F]" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Back Link */}
        <div className="pt-2 text-center">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#6E6C63] hover:text-[#17181F] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to The Ngalung Atelier catalog</span>
          </button>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17181F]/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#E7DFCE] text-[#17181F]">
            <div className="flex items-center justify-between border-b border-[#E7DFCE] pb-4">
              <div className="flex items-center gap-2.5">
                <LogoMark size={28} />
                <div>
                  <h3 className="font-display font-bold text-sm">Official Purchase Receipt</h3>
                  <p className="text-[10px] font-mono text-[#6E6C63]">The Ngalung Atelier</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="rounded-full p-1 text-[#6E6C63] hover:bg-[#F3EDE0]"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-[#6E6C63] font-mono">
                <span>Receipt Ref:</span>
                <span className="font-bold text-[#17181F]">{order?.orderNumber}</span>
              </div>
              <div className="flex justify-between text-[#6E6C63] font-mono">
                <span>Date:</span>
                <span className="text-[#17181F]">{order?.paidAt ? new Date(order.paidAt).toLocaleString() : 'Today'}</span>
              </div>
              <div className="flex justify-between text-[#6E6C63] font-mono">
                <span>Customer:</span>
                <span className="text-[#17181F]">{order?.buyerName}</span>
              </div>
              <div className="flex justify-between text-[#6E6C63] font-mono">
                <span>Email:</span>
                <span className="text-[#17181F]">{order?.buyerEmail}</span>
              </div>
              <div className="flex justify-between text-[#6E6C63] font-mono">
                <span>Item:</span>
                <span className="text-[#17181F] font-semibold">{product?.title}</span>
              </div>

              {/* Perforation Divider */}
              <div className="relative w-full my-3 border-t border-dashed border-[#D8CDB4]" />

              <div className="flex justify-between font-bold text-sm text-[#17181F]">
                <span>Total Amount Paid:</span>
                <span className="text-[#FF5A36] font-display text-base">
                  {order?.currency === 'USD' ? `$${order?.amount ?? 0}` : `₹${(order?.amount ?? 0).toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E7DFCE] flex gap-2">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#17181F] px-4 py-2.5 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F]"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="rounded-full border border-[#E7DFCE] px-4 py-2.5 text-xs font-semibold text-[#6E6C63] hover:bg-[#F3EDE0]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryVault;
