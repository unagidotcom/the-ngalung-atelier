import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ArrowRight,
  Tag,
  AlertCircle,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  KeyRound,
  RotateCcw,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, StoreSettings, CustomerUser } from '../types';
import { createOrder, verifyPayment, fetchPaymentConfig } from '../lib/api';
import { analytics } from '../lib/analytics';
import { LogoMark } from './LogoMark';

interface CheckoutModalProps {
  product: Product;
  currency: 'INR' | 'USD';
  settings?: StoreSettings | null;
  utmSource?: string;
  customerUser?: CustomerUser | null;
  onClose: () => void;
  onSuccess: (accessToken: string) => void;
  onNavigatePurchases?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  product,
  currency,
  settings,
  utmSource = 'direct',
  customerUser,
  onClose,
  onSuccess,
  onNavigatePurchases
}) => {
  // Form State
  const [buyerName, setBuyerName] = useState(customerUser?.name || '');
  const [buyerEmail, setBuyerEmail] = useState(customerUser?.email || '');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [discountError, setDiscountError] = useState('');

  // Gateway availability state
  const [checkingConfig, setCheckingConfig] = useState(true);

  // Step & Processing State
  // Allowed states: DETAILS | UNAVAILABLE | OPENING | PROCESSING | SUCCESS | FAILED | CANCELLED | ALREADY_OWNED | UNCERTAIN
  const [step, setStep] = useState<
    'DETAILS' | 'UNAVAILABLE' | 'OPENING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'ALREADY_OWNED' | 'UNCERTAIN'
  >('DETAILS');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [reconciling, setReconciling] = useState(false);

  // Confirmed order data on success or already owned
  const [confirmedOrder, setConfirmedOrder] = useState<{
    id?: string;
    orderNumber: string;
    accessToken: string;
    paymentId?: string;
    amount: number;
    currency: 'INR' | 'USD';
    productTitle: string;
    paidAt: string;
    buyerEmail?: string;
    emailDeliveryStatus?: string;
  } | null>(null);

  // Price Calculation
  const basePrice = currency === 'USD' ? product.priceUSD : product.priceINR;
  const discountAmount = appliedDiscount
    ? Math.round((basePrice * appliedDiscount.percent) / 100)
    : 0;
  const finalPrice = Math.max(1, basePrice - discountAmount);

  // Check Gateway Readiness on mount
  useEffect(() => {
    let isMounted = true;
    const checkGateway = async () => {
      try {
        const config = await fetchPaymentConfig();
        if (isMounted) {
          if (!config.configured) {
            setStep('UNAVAILABLE');
          }
        }
      } catch {
        if (isMounted) {
          setStep('UNAVAILABLE');
        }
      } finally {
        if (isMounted) {
          setCheckingConfig(false);
        }
      }
    };
    checkGateway();
    analytics.trackCheckoutStart(product.id, product.slug, product.priceINR);
    return () => {
      isMounted = false;
    };
  }, [product.id, product.slug, product.priceINR]);

  // Apply Discount Code
  const handleApplyDiscount = () => {
    if (!discountCode.trim()) return;
    setDiscountError('');
    const codeUpper = discountCode.trim().toUpperCase();

    const validCodes = settings?.discountCodes || [];

    const match = validCodes.find(d => d.active && d.code.toUpperCase() === codeUpper);
    if (match) {
      setAppliedDiscount({ code: match.code, percent: match.discountPercent });
      setDiscountError('');
    } else {
      setDiscountError('Invalid or expired coupon code');
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setDiscountError('');
  };

  // Proceed to Payment & Create Order on Server
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerEmail || !buyerEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address for digital delivery');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await createOrder({
        productId: product.id,
        productSlug: product.slug,
        buyerName: buyerName || 'Atelier Customer',
        buyerEmail: buyerEmail.trim().toLowerCase(),
        buyerPhone: buyerPhone.trim(),
        currency: currency,
        discountCode: appliedDiscount?.code,
        utmSource: utmSource
      });

      // Handle duplicate purchase protection
      if (res.alreadyOwned) {
        setConfirmedOrder({
          orderNumber: res.orderNumber || 'ACTIVE-LICENSE',
          accessToken: res.accessToken,
          paymentId: res.orderNumber,
          amount: product.priceINR,
          currency: 'INR',
          productTitle: product.title,
          paidAt: 'Active License'
        });
        setStep('ALREADY_OWNED');
        setLoading(false);
        return;
      }

      // Launch standard Razorpay Checkout Modal
      if (res.razorpay && typeof (window as any).Razorpay !== 'undefined') {
        setStep('OPENING');
        const options = {
          key: res.razorpay.keyId,
          amount: res.razorpay.amount,
          currency: res.razorpay.currency,
          name: settings?.storeName || 'The Ngalung Atelier',
          description: product.title,
          order_id: res.razorpay.orderId,
          prefill: {
            name: res.order?.buyerName || buyerName,
            email: res.order?.buyerEmail || buyerEmail,
            contact: buyerPhone || ''
          },
          theme: {
            color: '#FF5A36'
          },
          handler: async function (response: any) {
            setStep('PROCESSING');
            setLoading(true);
            try {
              const verifyRes = await verifyPayment({
                internalOrderId: res.order?.id || res.orderId,
                razorpayOrderId: response.razorpay_order_id || res.razorpay.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                paymentMethod: 'RAZORPAY'
              });

              if (verifyRes.success && verifyRes.accessToken) {
                confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
                analytics.trackPurchase(product.id, product.slug, res.order?.amount || finalPrice);
                setConfirmedOrder({
                  id: res.order?.id || res.orderId,
                  orderNumber: verifyRes.orderNumber || res.orderNumber,
                  accessToken: verifyRes.accessToken,
                  paymentId: verifyRes.paymentId || response.razorpay_payment_id,
                  amount: verifyRes.amount || res.order?.amount || finalPrice,
                  currency: verifyRes.currency || res.order?.currency || currency,
                  productTitle: product.title,
                  buyerEmail: res.order?.buyerEmail || buyerEmail,
                  emailDeliveryStatus: 'sent',
                  paidAt: new Date().toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })
                });
                setStep('SUCCESS');
              } else {
                setStep('FAILED');
                setErrorMsg(verifyRes.message || 'Payment signature verification failed.');
              }
            } catch (err: any) {
              // If network was severed or timeout happened during verify, allow user to reconcile safely
              setConfirmedOrder(prev => ({
                id: res.order?.id || res.orderId,
                orderNumber: res.orderNumber || 'PENDING',
                accessToken: '',
                amount: finalPrice,
                currency: currency,
                productTitle: product.title,
                paidAt: new Date().toLocaleDateString(),
                buyerEmail: buyerEmail
              }));
              setStep('UNCERTAIN');
              setErrorMsg(err.message || 'Verification could not be confirmed immediately. You can check status below.');
            } finally {
              setLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setStep('CANCELLED');
              setLoading(false);
            }
          }
        };

        try {
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } catch {
          setStep('UNAVAILABLE');
          setErrorMsg('Online payment is temporarily unavailable. Please check back soon.');
        }
      } else {
        // Razorpay SDK not available
        setStep('UNAVAILABLE');
        setErrorMsg('Online payment is temporarily unavailable. Please check back soon.');
      }
    } catch (err: any) {
      if (err.message === 'PAYMENT_UNAVAILABLE' || err.message?.includes('unavailable')) {
        setStep('UNAVAILABLE');
      } else {
        setErrorMsg(err.message || 'Online payment is temporarily unavailable. Please check back soon.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReconcileOrder = async () => {
    if (!confirmedOrder?.id && !confirmedOrder?.orderNumber) return;
    setReconciling(true);
    setErrorMsg('');
    try {
      const orderIdToCheck = confirmedOrder.id || confirmedOrder.orderNumber;
      const res = await fetch(`/api/orders/${orderIdToCheck}/reconcile`);
      const data = await res.json();
      if (data.success && data.order?.status === 'paid' && data.order?.accessToken) {
        setConfirmedOrder(prev => ({
          ...prev!,
          orderNumber: data.order.orderNumber,
          accessToken: data.order.accessToken,
          productTitle: data.order.productTitle || product.title,
          amount: data.order.amount,
          currency: data.order.currency,
          emailDeliveryStatus: data.order.emailDeliveryStatus || 'sent',
          paidAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        }));
        setStep('SUCCESS');
      } else {
        setErrorMsg('Transaction is still pending confirmation from bank. Please check again in a few moments.');
      }
    } catch {
      setErrorMsg('Could not verify status at this moment. You can safely check My Purchases in your account.');
    } finally {
      setReconciling(false);
    }
  };

  const handleDownloadDirectly = () => {
    if (confirmedOrder?.accessToken) {
      window.location.href = `/api/access/${confirmedOrder.accessToken}/download`;
    }
  };

  const handleOpenVault = () => {
    if (confirmedOrder?.accessToken) {
      onSuccess(confirmedOrder.accessToken);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17181F]/70 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#FFFFFF] text-[#17181F] shadow-2xl border border-[#E7DFCE] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7DFCE] bg-[#FAF6EE] px-6 py-4">
          <div className="flex items-center gap-3">
            <LogoMark size={28} />
            <div>
              <h3 className="font-display text-sm font-bold text-[#17181F]">Atelier Secure Checkout</h3>
              <p className="text-[11px] text-[#6E6C63] font-mono">Encrypted Delivery Vault Access</p>
            </div>
          </div>
          <button
            id="checkout-close-btn"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Product Summary Row */}
        {step !== 'SUCCESS' && step !== 'ALREADY_OWNED' && (
          <div className="flex items-center justify-between border-b border-[#E7DFCE] px-6 py-3.5 bg-[#FAF6EE]/50">
            <div className="flex items-center gap-3 truncate">
              <img
                src={product.coverImage}
                alt={product.title}
                className="h-11 w-11 rounded-xl object-cover border border-[#E7DFCE] shrink-0"
              />
              <div className="truncate max-w-[220px] sm:max-w-xs">
                <h4 className="text-xs font-bold text-[#17181F] truncate">{product.title}</h4>
                <span className="inline-block rounded-full bg-[#F3EDE0] px-2 py-0.5 text-[10px] font-semibold text-[#6E6C63] mt-0.5 border border-[#E7DFCE]">
                  {product.category}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-base font-bold text-[#FF5A36]">
                {currency === 'USD' ? `${finalPrice ?? 0}` : `₹${(finalPrice ?? 0).toLocaleString('en-IN')}`}
              </div>
              {discountAmount > 0 && (
                <div className="text-[10px] font-mono line-through text-[#A6A296]">
                  {currency === 'USD' ? `${basePrice ?? 0}` : `₹${(basePrice ?? 0).toLocaleString('en-IN')}`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* State 1: Checking Config Spinner */}
        {checkingConfig && (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#E7DFCE] border-t-[#FF5A36]" />
            <p className="text-xs text-[#6E6C63] font-mono">Initializing secure checkout session...</p>
          </div>
        )}

        {/* State 2: Online Payment Unavailable Fallback */}
        {!checkingConfig && step === 'UNAVAILABLE' && (
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF6EE] border border-[#E7DFCE] text-[#FF5A36]">
              <AlertTriangle className="h-7 w-7 text-[#FF5A36]" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-base font-bold text-[#17181F]">
                Online payment is temporarily unavailable.
              </h3>
              <p className="text-xs text-[#6E6C63] leading-relaxed max-w-sm mx-auto">
                Our payment gateway is currently performing scheduled maintenance. Please check back shortly.
              </p>
            </div>

            <div className="pt-2">
              <button
                id="checkout-close-unavailable-btn"
                type="button"
                onClick={onClose}
                className="w-full rounded-full bg-[#17181F] px-6 py-3 text-xs font-bold text-[#FAF6EE] shadow-sm hover:bg-[#31333F] transition-colors cursor-pointer"
              >
                Close Checkout
              </button>
            </div>
          </div>
        )}

        {/* State 3: Customer Details & Coupon Form (When Gateway is Ready) */}
        {!checkingConfig && step === 'DETAILS' && (
          <form onSubmit={handleProceedToPayment} className="p-6 space-y-4">
            {customerUser && (
              <div className="flex items-center justify-between rounded-xl bg-[#FAF6EE] px-3.5 py-2 border border-[#E7DFCE] text-xs">
                <div className="flex items-center gap-2 truncate">
                  <ShieldCheck className="h-4 w-4 text-[#1F8F5F] shrink-0" />
                  <span className="text-[#6E6C63] truncate">
                    Signed in: <strong className="text-[#17181F] font-mono">{customerUser.email}</strong>
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-[#1F8F5F] shrink-0">
                  Vault Linked
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#17181F] mb-1">
                Your Email Address <span className="text-[#FF5A36]">*</span>
              </label>
              <input
                id="checkout-email-input"
                type="email"
                required
                value={buyerEmail}
                onChange={e => setBuyerEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] px-4 py-2.5 text-xs sm:text-sm text-[#17181F] placeholder:text-[#A6A296] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[#6E6C63] font-mono">
                Your permanent vault access key and receipt will be delivered to this email.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#17181F] mb-1">
                  Full Name
                </label>
                <input
                  id="checkout-name-input"
                  type="text"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  placeholder="e.g. Alex Smith"
                  className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] px-4 py-2.5 text-xs sm:text-sm text-[#17181F] placeholder:text-[#A6A296] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17181F] mb-1">
                  Mobile (Optional)
                </label>
                <input
                  id="checkout-phone-input"
                  type="tel"
                  value={buyerPhone}
                  onChange={e => setBuyerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] px-4 py-2.5 text-xs sm:text-sm text-[#17181F] placeholder:text-[#A6A296] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none"
                />
              </div>
            </div>

            {/* Discount Coupon Section */}
            <div className="rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-3.5">
              {appliedDiscount ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-[#FF5A36]" />
                    <div>
                      <span className="text-xs font-bold text-[#17181F] font-mono">{appliedDiscount.code}</span>
                      <span className="ml-2 text-xs text-[#1F8F5F] font-semibold font-mono">
                        ({appliedDiscount.percent}% discount applied)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveDiscount}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      id="coupon-code-input"
                      type="text"
                      value={discountCode}
                      onChange={e => setDiscountCode(e.target.value)}
                    placeholder="Coupon code"
                      className="w-full rounded-xl border border-[#E7DFCE] bg-[#FFFFFF] px-3 py-2 text-xs text-[#17181F] uppercase placeholder:normal-case placeholder:text-[#A6A296] focus:border-[#FF5A36] focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      className="shrink-0 rounded-xl bg-[#17181F] px-4 py-2 text-xs font-semibold text-[#FAF6EE] hover:bg-[#31333F] transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {discountError && (
                    <p className="mt-1 text-[10px] text-red-600 font-mono">{discountError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Total breakdown */}
            <div className="rounded-2xl bg-[#FAF6EE] p-4 text-xs space-y-1.5 border border-[#E7DFCE]">
              <div className="flex justify-between text-[#6E6C63] font-mono">
                <span>Subtotal</span>
                <span>{currency === 'USD' ? `${basePrice ?? 0}` : `₹${(basePrice ?? 0).toLocaleString('en-IN')}`}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#1F8F5F] font-semibold font-mono">
                  <span>Discount</span>
                  <span>-{currency === 'USD' ? `${discountAmount ?? 0}` : `₹${(discountAmount ?? 0).toLocaleString('en-IN')}`}</span>
                </div>
              )}
              <div className="border-t border-[#E7DFCE] pt-2 flex justify-between font-bold text-[#17181F] text-sm">
                <span>Total Due</span>
                <span className="text-[#FF5A36] font-display text-base">
                  {currency === 'USD' ? `${finalPrice ?? 0}` : `₹${(finalPrice ?? 0).toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>

            {/* Customer Legal Consent */}
            <p className="text-[11px] text-[#6E6C63] text-center font-mono leading-relaxed px-2">
              By proceeding, you agree to receive digital access to this product and acknowledge our Terms and Privacy Policy. Instant electronic fulfillment.
            </p>

            <button
              id="checkout-proceed-btn"
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF5A36] px-5 py-3.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#E64A27] disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Pay Securely {currency === 'USD' ? `${finalPrice ?? 0}` : `₹${(finalPrice ?? 0).toLocaleString('en-IN')}`}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            
            <div className="text-center font-mono text-[10px] text-[#A6A296]">
              Secure checkout via Razorpay • UPI QR • Cards • NetBanking
            </div>
          </form>
        )}

        {/* State 4a: Opening Payment Gateway */}
        {step === 'OPENING' && (
          <div className="p-10 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFE7DD] text-[#FF5A36] border border-[#FFD0BF]">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#FF5A36] border-t-transparent" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-[#17181F]">Opening Razorpay Checkout</h3>
              <p className="text-xs text-[#6E6C63] leading-relaxed max-w-sm mx-auto">
                Connecting to secure payment gateway. Please complete your transaction in the modal.
              </p>
            </div>
          </div>
        )}

        {/* State 4b: Payment Processing / Signature Verification */}
        {step === 'PROCESSING' && (
          <div className="p-10 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFE7DD] text-[#FF5A36] border border-[#FFD0BF]">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#FF5A36] border-t-transparent" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-[#17181F]">Verifying Payment</h3>
              <p className="text-xs text-[#6E6C63] leading-relaxed max-w-sm mx-auto">
                We're confirming your cryptographic signature with the server. Please don't close this page.
              </p>
            </div>
          </div>
        )}

        {/* State 5: Payment Successful State */}
        {step === 'SUCCESS' && confirmedOrder && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1F8F5F]/15 text-[#1F8F5F] border border-[#1F8F5F]/30">
                <CheckCircle2 className="h-8 w-8 text-[#1F8F5F]" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#17181F]">Payment Successful</h3>
              <p className="text-xs text-[#6E6C63]">
                Your transaction is confirmed. Your digital access is active and ready.
              </p>
            </div>

            {/* Order Confirmation Details Box */}
            <div className="rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-4 text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-[#E7DFCE]">
                <span className="text-[#6E6C63] font-mono">Product</span>
                <span className="font-bold text-[#17181F] text-right max-w-[200px] truncate">
                  {confirmedOrder.productTitle}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E7DFCE]">
                <span className="text-[#6E6C63] font-mono">Amount Paid</span>
                <span className="font-display font-bold text-[#FF5A36] text-sm">
                  {confirmedOrder.currency === 'USD' ? `${confirmedOrder.amount ?? 0}` : `₹${(confirmedOrder.amount ?? 0).toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E7DFCE]">
                <span className="text-[#6E6C63] font-mono">Order Number</span>
                <span className="font-mono font-bold text-[#17181F]">
                  {confirmedOrder.orderNumber}
                </span>
              </div>
              {confirmedOrder.paymentId && (
                <div className="flex justify-between items-center pb-2 border-b border-[#E7DFCE]">
                  <span className="text-[#6E6C63] font-mono">Payment Reference</span>
                  <span className="font-mono text-[#17181F] text-[11px] truncate max-w-[180px]">
                    {confirmedOrder.paymentId}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-[#E7DFCE]">
                <span className="text-[#6E6C63] font-mono">Purchase Date</span>
                <span className="font-mono text-[#17181F]">
                  {confirmedOrder.paidAt}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6E6C63] font-mono">Email Receipt</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#1F8F5F] font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  Sent to {confirmedOrder.buyerEmail || buyerEmail}
                </span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                id="access-purchase-btn"
                type="button"
                onClick={handleOpenVault}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#17181F] px-5 py-3 text-xs sm:text-sm font-bold text-[#FAF6EE] shadow-sm hover:bg-[#31333F] transition-all cursor-pointer"
              >
                <KeyRound className="h-4 w-4 text-[#FF5A36]" />
                <span>Access My Purchase Vault</span>
              </button>

              <button
                id="download-product-btn"
                type="button"
                onClick={handleDownloadDirectly}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-5 py-3 text-xs sm:text-sm font-semibold text-[#17181F] hover:bg-[#FAF6EE] transition-all cursor-pointer"
              >
                <Download className="h-4 w-4 text-[#17181F]" />
                <span>Download Product File</span>
              </button>

              {onNavigatePurchases && (
                <button
                  id="view-my-purchases-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigatePurchases();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[#E7DFCE] bg-[#FAF6EE] px-5 py-2.5 text-xs font-semibold text-[#17181F] hover:bg-[#F3EDE0] transition-all cursor-pointer"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-[#6E6C63]" />
                  <span>View All My Purchases</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* State 6: Duplicate Purchase Protection (Already Owned) */}
        {step === 'ALREADY_OWNED' && confirmedOrder && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1F8F5F]/15 text-[#1F8F5F] border border-[#1F8F5F]/30">
                <ShieldCheck className="h-8 w-8 text-[#1F8F5F]" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#17181F]">
                You already own this product.
              </h3>
              <p className="text-xs text-[#1F8F5F] font-semibold">
                Your digital access is active and ready to use.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-4 text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-[#E7DFCE]">
                <span className="text-[#6E6C63] font-mono">Product</span>
                <span className="font-bold text-[#17181F] text-right truncate max-w-[200px]">
                  {confirmedOrder.productTitle}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6E6C63] font-mono">License Status</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1F8F5F]/15 px-2.5 py-0.5 text-[10px] font-bold font-mono text-[#1F8F5F]">
                  <CheckCircle2 className="h-3 w-3" />
                  ACTIVE LICENSE
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                id="already-owned-access-btn"
                type="button"
                onClick={handleOpenVault}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#17181F] px-5 py-3 text-xs sm:text-sm font-bold text-[#FAF6EE] shadow-sm hover:bg-[#31333F] transition-all cursor-pointer"
              >
                <KeyRound className="h-4 w-4 text-[#FF5A36]" />
                <span>Access My Purchase</span>
              </button>

              <button
                id="already-owned-download-btn"
                type="button"
                onClick={handleDownloadDirectly}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-5 py-3 text-xs sm:text-sm font-semibold text-[#17181F] hover:bg-[#FAF6EE] transition-all cursor-pointer"
              >
                <Download className="h-4 w-4 text-[#17181F]" />
                <span>Download Product</span>
              </button>

              {onNavigatePurchases && (
                <button
                  id="already-owned-purchases-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigatePurchases();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[#E7DFCE] bg-[#FAF6EE] px-5 py-2.5 text-xs font-semibold text-[#17181F] hover:bg-[#F3EDE0] transition-all cursor-pointer"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-[#6E6C63]" />
                  <span>View My Purchases</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* State 7: Payment Failed State */}
        {step === 'FAILED' && (
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 border border-red-200">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-base font-bold text-[#17181F]">
                Payment could not be completed.
              </h3>
              <p className="text-xs text-[#6E6C63] leading-relaxed max-w-sm mx-auto">
                {errorMsg || 'Your card or bank was not charged. Please check your payment details or try another payment method.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                id="payment-failed-retry-btn"
                type="button"
                onClick={() => {
                  setStep('DETAILS');
                  setErrorMsg('');
                }}
                className="w-full rounded-full bg-[#FF5A36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#E64A27] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>
              <button
                id="payment-failed-back-btn"
                type="button"
                onClick={onClose}
                className="w-full rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-5 py-2.5 text-xs font-semibold text-[#17181F] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
              >
                Back to Product
              </button>
            </div>
          </div>
        )}

        {/* State 8: Payment Cancelled State */}
        {step === 'CANCELLED' && (
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF6EE] border border-[#E7DFCE] text-[#6E6C63]">
              <RotateCcw className="h-7 w-7 text-[#6E6C63]" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-base font-bold text-[#17181F]">
                Payment was cancelled.
              </h3>
              <p className="text-xs text-[#6E6C63] leading-relaxed max-w-sm mx-auto">
                You exited checkout before completing payment. No funds were debited.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                id="payment-cancelled-retry-btn"
                type="button"
                onClick={() => {
                  setStep('DETAILS');
                  setErrorMsg('');
                }}
                className="w-full rounded-full bg-[#FF5A36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#E64A27] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>
              <button
                id="payment-cancelled-back-btn"
                type="button"
                onClick={onClose}
                className="w-full rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-5 py-2.5 text-xs font-semibold text-[#17181F] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
              >
                Back to Product
              </button>
            </div>
          </div>
        )}

        {/* State 9: UNCERTAIN State (Verification Network Glitch / Reconcile) */}
        {step === 'UNCERTAIN' && (
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF6EE] border border-[#E7DFCE] text-[#FF5A36]">
              <AlertCircle className="h-7 w-7 text-[#FF5A36]" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-base font-bold text-[#17181F]">
                Verifying Payment Status
              </h3>
              <p className="text-xs text-[#6E6C63] leading-relaxed max-w-sm mx-auto">
                If your payment was processed by your bank, our server will sync your access token automatically. Click below to verify.
              </p>
              {errorMsg && (
                <p className="text-[11px] font-mono text-red-600 pt-1">{errorMsg}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                id="payment-reconcile-check-btn"
                type="button"
                disabled={reconciling}
                onClick={handleReconcileOrder}
                className="w-full rounded-full bg-[#FF5A36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#E64A27] transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {reconciling ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span>Check Payment Status</span>
              </button>
              <button
                id="payment-uncertain-close-btn"
                type="button"
                onClick={onClose}
                className="w-full rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-5 py-2.5 text-xs font-semibold text-[#17181F] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CheckoutModal;
