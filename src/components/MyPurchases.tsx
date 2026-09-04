import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Mail,
  ArrowRight,
  Download,
  AlertCircle,
  LogIn,
  UserPlus,
  Package,
  CheckCircle2,
  Shield,
  ExternalLink,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { fetchCustomerOrders, fetchMyPurchases } from '../lib/api';
import { CustomerUser, CustomerOrder } from '../types';

interface MyPurchasesProps {
  customerUser?: CustomerUser | null;
  onAccessVault: (token: string) => void;
  onNavigateHome: () => void;
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
}

export const MyPurchases: React.FC<MyPurchasesProps> = ({
  customerUser,
  onAccessVault,
  onNavigateHome,
  onNavigateLogin,
  onNavigateRegister
}) => {
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<CustomerOrder[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch orders on mount or when customerUser changes
  useEffect(() => {
    if (customerUser) {
      setLoading(true);
      setErrorMsg('');
      fetchCustomerOrders()
        .then(orders => {
          setPurchases(orders || []);
        })
        .catch(err => {
          setErrorMsg(err.message || 'Failed to load your account purchases.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setPurchases([]);
    }
  }, [customerUser]);

  const handleDownloadFile = (order: CustomerOrder) => {
    if ((order.status === 'paid' || order.status === 'partially_refunded') && order.accessToken) {
      window.location.href = `/api/access/${order.accessToken}/download`;
    }
  };

  const getStatusBadge = (order: CustomerOrder) => {
    switch (order.status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#1F8F5F]/15 border border-[#1F8F5F]/30 px-2.5 py-0.5 text-[10px] font-bold font-mono text-[#1F8F5F]">
            <CheckCircle2 className="h-3 w-3" />
            PAID
          </span>
        );
      case 'partially_refunded':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold font-mono text-amber-800">
            <RefreshCw className="h-3 w-3" />
            PARTIALLY REFUNDED
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 border border-stone-300 px-2.5 py-0.5 text-[10px] font-bold font-mono text-stone-700">
            <XCircle className="h-3 w-3" />
            REFUNDED
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold font-mono text-amber-800">
            <Clock className="h-3 w-3" />
            PENDING PAYMENT
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-300 px-2.5 py-0.5 text-[10px] font-bold font-mono text-red-700">
            <XCircle className="h-3 w-3" />
            PAYMENT FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold font-mono text-stone-600">
            {(order.status || '').toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="min-h-[80vh] bg-[#FAF6EE] text-[#17181F] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        
        {/* Page Header */}
        <div className="text-center space-y-2.5 mb-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE7DD] text-[#FF5A36] border border-[#FF5A36]/20 shadow-2xs">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#17181F]">
            My Purchases
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6C63] max-w-md mx-auto">
            {customerUser
              ? `Manage and download digital assets for ${customerUser.name}.`
              : 'Sign in to access your digital library, Notion duplicate links, and downloads.'}
          </p>
        </div>

        {/* Authenticated Customer View */}
        {customerUser ? (
          <div className="space-y-6">
            
            {/* Account Summary Strip */}
            <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-5 sm:p-6 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#17181F] text-[#FAF6EE] font-bold text-sm">
                  {customerUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-[#17181F]">{customerUser.name}</span>
                    <span className="rounded-full bg-[#1F8F5F]/10 text-[#1F8F5F] px-2 py-0.5 text-[9px] font-bold font-mono uppercase">
                      Active Customer
                    </span>
                  </div>
                  <span className="text-xs text-[#6E6C63] font-mono">{customerUser.email}</span>
                </div>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-xs font-mono text-[#6E6C63]">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#FF5A36]" />
                  <span className="hidden sm:inline">Syncing vault...</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* List of Customer Purchases */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#A6A296] font-mono">
                  Your Digital Products ({purchases.length})
                </h2>
              </div>

              {/* Empty State */}
              {!loading && purchases.length === 0 && (
                <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-10 text-center space-y-4 shadow-2xs">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF6EE] border border-[#E7DFCE] text-[#6E6C63]">
                    <Package className="h-7 w-7 text-[#A6A296]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-base text-[#17181F]">
                      No purchases yet.
                    </h3>
                    <p className="text-xs text-[#6E6C63] max-w-sm mx-auto">
                      Your purchased digital products will appear here.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      id="empty-browse-products-btn"
                      onClick={onNavigateHome}
                      className="rounded-full bg-[#17181F] px-6 py-2.5 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F] transition-all cursor-pointer shadow-2xs"
                    >
                      Browse Products
                    </button>
                  </div>
                </div>
              )}

              {/* Purchase Cards */}
              <div className="space-y-3.5">
                {purchases.map(order => {
                  const hasAccess = (order.status === 'paid' || order.status === 'partially_refunded') && Boolean(order.accessToken);
                  const isRefunded = order.status === 'refunded';
                  const purchaseDate = order.paidAt
                    ? new Date(order.paidAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Recent';

                  return (
                    <div
                      key={order.id}
                      className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-5 sm:p-6 shadow-2xs hover:border-[#D8CDB4] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
                    >
                      {/* Product details */}
                      <div className="flex items-start gap-4">
                        {order.productCover ? (
                          <img
                            src={order.productCover}
                            alt={order.productTitle}
                            className="h-16 w-16 rounded-2xl object-cover border border-[#E7DFCE] shrink-0"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] text-[#A6A296]">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {getStatusBadge(order)}
                            <span className="text-[11px] font-mono text-[#A6A296]">
                              {order.orderNumber}
                            </span>
                          </div>

                          <h3 className="font-display text-sm sm:text-base font-bold text-[#17181F]">
                            {order.productTitle}
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6E6C63] font-mono pt-0.5">
                            <span>Purchased: <strong className="text-[#17181F] font-semibold">{purchaseDate}</strong></span>
                            <span>•</span>
                            <span>Order Total: <strong className="text-[#17181F] font-semibold">{order.currency === 'USD' ? `$${order.amount ?? 0}` : `₹${(order.amount ?? 0).toLocaleString('en-IN')}`}</strong></span>
                            {order.refundAmount ? (
                              <>
                                <span>•</span>
                                <span className="text-[#FF5A36] font-semibold">Refunded: {order.currency === 'USD' ? `$${order.refundAmount}` : `₹${(order.refundAmount).toLocaleString('en-IN')}`}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E7DFCE]">
                        {hasAccess ? (
                          <>
                            <button
                              id={`open-vault-btn-${order.id}`}
                              type="button"
                              onClick={() => order.accessToken && onAccessVault(order.accessToken)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-[#17181F] px-5 py-2.5 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F] transition-all cursor-pointer shadow-2xs"
                            >
                              <span>Open Vault</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>

                            <button
                              id={`download-file-btn-${order.id}`}
                              type="button"
                              onClick={() => handleDownloadFile(order)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E7DFCE] bg-[#FAF6EE] px-4 py-2 text-xs font-semibold text-[#17181F] hover:bg-[#F3EDE0] transition-all cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5 text-[#FF5A36]" />
                              <span>Download</span>
                            </button>
                          </>
                        ) : isRefunded ? (
                          <div className="text-right text-[11px] font-mono text-[#6E6C63] bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl">
                            <span className="font-semibold text-stone-700">Access Revoked</span>
                            <div className="text-[10px] text-stone-500">Order fully refunded</div>
                          </div>
                        ) : (
                          <div className="text-right text-[11px] font-mono text-[#A6A296]">
                            <span>Delivery Locked ({order.status})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Unauthenticated Customer View */
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-8 sm:p-10 shadow-2xs text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE7DD] text-[#FF5A36] border border-[#FF5A36]/20">
                <Shield className="h-7 w-7 text-[#FF5A36]" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-display text-xl font-bold text-[#17181F]">
                  Sign In to Access Your Purchases
                </h2>
                <p className="text-xs sm:text-sm text-[#6E6C63] max-w-md mx-auto">
                  Please log in with your customer account to access your digital workspace, downloads, and receipts.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  id="purchases-signin-btn"
                  onClick={onNavigateLogin}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#17181F] px-7 py-3 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F] transition-all cursor-pointer shadow-2xs"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </button>

                <button
                  id="purchases-register-btn"
                  onClick={onNavigateRegister}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#E7DFCE] bg-[#FAF6EE] px-7 py-3 text-xs font-bold text-[#17181F] hover:bg-[#F3EDE0] transition-all cursor-pointer shadow-2xs"
                >
                  <UserPlus className="h-4 w-4 text-[#FF5A36]" />
                  <span>Create Customer Account</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MyPurchases;
