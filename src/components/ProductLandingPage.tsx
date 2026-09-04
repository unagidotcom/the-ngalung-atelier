import React, { useState, useEffect } from 'react';
import {
  Star,
  Check,
  ShieldCheck,
  Zap,
  Lock,
  Share2,
  ChevronDown,
  Sparkles,
  Layers,
  Gift,
  ArrowRight,
  Clock,
  DownloadCloud
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { logAnalyticsEvent } from '../lib/api';
import { ShareModal } from './ShareModal';

interface ProductLandingPageProps {
  product: Product;
  currency: 'INR' | 'USD';
  settings?: StoreSettings | null;
  utmSource?: string;
  isOwned?: boolean;
  ownedAccessToken?: string;
  onOpenVault?: (accessToken: string) => void;
  onBuyNow: (product: Product) => void;
  onNavigateHome: () => void;
}

export const ProductLandingPage: React.FC<ProductLandingPageProps> = ({
  product,
  currency,
  utmSource = 'direct',
  isOwned = false,
  ownedAccessToken,
  onOpenVault,
  onBuyNow,
}) => {
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string>(product.coverImage);
  const [showShareModal, setShowShareModal] = useState(false);
  const [openModuleId, setOpenModuleId] = useState<string | null>(
    product.modules && product.modules.length > 0 ? product.modules[0].id : null
  );
  const [openFaqId, setOpenFaqId] = useState<string | null>(
    product.faqs && product.faqs.length > 0 ? product.faqs[0].id : null
  );
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Log page view event with UTM on mount
  useEffect(() => {
    logAnalyticsEvent({
      productId: product.id,
      productSlug: product.slug,
      type: 'visit',
      source: utmSource,
      path: `/p/${product.slug}`
    });
  }, [product.id, product.slug, utmSource]);

  // Scroll listener for sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 420) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const price = currency === 'USD' ? product.priceUSD : product.priceINR;
  const originalPrice = currency === 'USD' ? product.originalPriceUSD : product.originalPriceINR;
  const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);

  const handleCtaClick = () => {
    logAnalyticsEvent({
      productId: product.id,
      productSlug: product.slug,
      type: 'click',
      source: utmSource,
      path: `/p/${product.slug}`
    });
    onBuyNow(product);
  };

  const previewList = [product.coverImage, ...(product.previewImages || [])];

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#17181F] pb-24">
      
      {/* Promotion / UTM Announcement Banner if source is present */}
      {utmSource && utmSource !== 'direct' && (
        <div className="bg-[#FFE7DD] border-b border-[#FF5A36]/30 px-4 py-2 text-center text-xs font-medium text-[#17181F]">
          <span>Referral Link: <strong className="font-mono text-[#FF5A36]">{utmSource}</strong> • Instant digital vault access active</span>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        
        {/* Top Product Section */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
          
          {/* Left Column: Visual Showcase Gallery (6 cols) */}
          <div className="lg:col-span-6 space-y-3 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-2.5 shadow-2xs">
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-[#F3EDE0] border border-[#E7DFCE]">
                <img
                  src={selectedPreviewImage}
                  alt={product.title}
                  className="h-full w-full object-cover transition-all duration-300 hover:scale-102"
                />
                {product.badge && (
                  <span className="absolute top-3 left-3 rounded-full bg-[#17181F] text-[#FAF6EE] px-3 py-1 text-xs font-bold shadow-2xs font-mono">
                    {product.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails row */}
            {previewList.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                {previewList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPreviewImage(img)}
                    className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer shadow-2xs ${
                      selectedPreviewImage === img
                        ? 'border-[#FF5A36] ring-2 ring-[#FF5A36]/20'
                        : 'border-[#E7DFCE] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Guarantee Box under image */}
            <div className="hidden sm:grid grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="flex items-center gap-2.5 rounded-2xl border border-[#E7DFCE] bg-[#FFFFFF] p-3.5 shadow-2xs">
                <Zap className="h-4 w-4 text-[#FF5A36] shrink-0" />
                <span className="font-semibold text-[#17181F]">Instant Delivery Vault</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-[#E7DFCE] bg-[#FFFFFF] p-3.5 shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-[#1F8F5F] shrink-0" />
                <span className="font-semibold text-[#17181F]">Lifetime Updates</span>
              </div>
            </div>
          </div>

          {/* Right Column: Product Narrative & Buy Box (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Category & Rating */}
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#F3EDE0] px-3 py-1 text-xs font-semibold text-[#17181F] border border-[#E7DFCE]">
                  {product.category}
                </span>

                <button
                  id="product-share-btn"
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-3 py-1 text-xs font-medium text-[#17181F] shadow-2xs hover:bg-[#F3EDE0] transition-colors cursor-pointer"
                  title="Share link & QR code"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share</span>
                </button>
              </div>

              <h1 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#17181F] leading-tight">
                {product.title}
              </h1>

              <p className="mt-2 text-sm sm:text-base text-[#6E6C63] leading-relaxed">
                {product.tagline}
              </p>

              {/* Social Proof Star Ratings */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-[#F2A93B] text-[#F2A93B]" />
                  ))}
                </div>
                <span className="text-xs font-bold text-[#17181F] font-mono">
                  {product.ratingAverage} / 5.0
                </span>
                <span className="text-[#A6A296]">·</span>
                <span className="text-xs font-mono text-[#6E6C63]">
                  {product.totalSalesCount}+ verified downloads
                </span>
              </div>
            </div>

            {/* Price & CTA Action Card */}
            <div className="relative rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 shadow-2xs space-y-5">
              <div className="flex items-baseline justify-between border-b border-[#E7DFCE] pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A6A296] block font-mono">
                    Instant Lifetime Access
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-display text-3xl font-bold text-[#FF5A36]">
                      {currency === 'USD' ? `$${price ?? 0}` : `₹${(price ?? 0).toLocaleString('en-IN')}`}
                    </span>
                    <span className="text-sm text-[#A6A296] line-through font-mono">
                      {currency === 'USD' ? `$${originalPrice ?? 0}` : `₹${(originalPrice ?? 0).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="rounded-full bg-[#1F8F5F]/10 text-[#1F8F5F] border border-[#1F8F5F]/30 px-3 py-0.5 text-xs font-bold font-mono">
                    {discountPercent}% OFF
                  </span>
                  <span className="block text-[11px] font-mono text-[#A6A296] mt-1">Single one-time payment</span>
                </div>
              </div>

              {/* Primary Action Button (Owned vs Buy) */}
              {isOwned ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-2xl bg-[#1F8F5F]/10 border border-[#1F8F5F]/20 p-3 text-xs text-[#1F8F5F] font-medium">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#1F8F5F]" />
                    <span>You already own this product. Your access is active.</span>
                  </div>
                  <button
                    id="product-access-vault-btn"
                    type="button"
                    onClick={() => {
                      if (ownedAccessToken && onOpenVault) {
                        onOpenVault(ownedAccessToken);
                      }
                    }}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#17181F] px-6 py-4 text-sm font-bold text-[#FAF6EE] shadow-sm hover:bg-[#31333F] active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4 text-[#FF5A36]" />
                    <span>Access My Purchase</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ) : (
                <button
                  id="product-main-buy-btn"
                  type="button"
                  onClick={handleCtaClick}
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#FF5A36] px-6 py-4 text-sm font-bold text-[#FFFFFF] shadow-sm hover:bg-[#E64A27] active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Zap className="h-4 w-4 fill-white" />
                  <span>Get Instant Access Vault</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Payment badges */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[#6E6C63] pt-0.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Check className="h-3.5 w-3.5 text-[#1F8F5F] stroke-[3]" />
                  Instant UPI & QR
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Check className="h-3.5 w-3.5 text-[#1F8F5F] stroke-[3]" />
                  Global Cards
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="h-3.5 w-3.5 text-[#FF5A36]" />
                  Encrypted Delivery
                </span>
              </div>
            </div>

            {/* Description Paragraph */}
            <div className="rounded-3xl bg-[#FFFFFF] p-6 border border-[#E7DFCE] shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A6A296] font-mono mb-2.5">
                System Overview
              </h3>
              <p className="text-xs sm:text-sm text-[#17181F] leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Key Features Checklist */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A6A296] font-mono">
                Included in Your Delivery Vault
              </h3>
              <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-5 space-y-2.5 shadow-2xs">
                {(product.features || []).map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-[#17181F]">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1F8F5F]/15 text-[#1F8F5F] mt-0.5">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Modules / Curriculum Section (if exists) */}
        {product.modules && product.modules.length > 0 && (
          <div className="mt-14 rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xs space-y-5">
            <div>
              <span className="rounded-full bg-[#F3EDE0] px-3 py-1 text-xs font-bold text-[#17181F] border border-[#E7DFCE] font-mono">
                Curriculum & Component Breakdown
              </span>
              <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold tracking-tight text-[#17181F]">
                Inside the System
              </h2>
              <p className="text-xs text-[#6E6C63]">
                Modular structure configured for rapid duplicate-and-use deployment.
              </p>
            </div>

            <div className="space-y-2.5">
              {(product.modules || []).map(mod => {
                const isOpen = openModuleId === mod.id;
                return (
                  <div
                    key={mod.id}
                    className="rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenModuleId(isOpen ? null : mod.id)}
                      className="flex w-full items-center justify-between p-4 text-left font-semibold text-[#17181F] hover:bg-[#F3EDE0] cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Layers className="h-4 w-4 text-[#FF5A36]" />
                        <span className="text-xs sm:text-sm font-bold">{mod.title}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {mod.durationOrPages && (
                          <span className="rounded-full bg-[#FFFFFF] px-2.5 py-0.5 text-[10px] font-mono text-[#6E6C63] border border-[#E7DFCE]">
                            {mod.durationOrPages}
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-[#6E6C63] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-[#E7DFCE] bg-[#FFFFFF] p-4 text-xs text-[#6E6C63] space-y-2">
                        {mod.description && <p className="leading-relaxed">{mod.description}</p>}
                        {mod.items && mod.items.length > 0 && (
                          <ul className="list-disc pl-5 space-y-1 text-[#17181F] pt-1">
                            {(mod.items || []).map((it, i) => (
                              <li key={i}>{it}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Free Bonuses Section */}
        {product.digitalAsset?.bonuses && product.digitalAsset.bonuses.length > 0 && (
          <div className="mt-10 rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Gift className="h-5 w-5 text-[#FF5A36]" />
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#17181F]">
                Exclusive Companion Assets Included
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#6E6C63]">
              Instantly unlocked inside your customer delivery vault.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {(product.digitalAsset.bonuses || []).map(bonus => (
                <div
                  key={bonus.id}
                  className="rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-4 space-y-1.5"
                >
                  <span className="rounded-full bg-[#FFE7DD] text-[#FF5A36] px-2.5 py-0.5 text-[10px] font-bold font-mono border border-[#FF5A36]/20">
                    {bonus.value}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-[#17181F]">{bonus.title}</h3>
                  <p className="text-xs text-[#6E6C63] leading-relaxed">{bonus.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testimonials Section */}
        {product.testimonials && product.testimonials.length > 0 && (
          <div className="mt-14 space-y-5">
            <div className="text-center">
              <span className="rounded-full bg-[#F3EDE0] px-3.5 py-1 text-xs font-semibold text-[#17181F] border border-[#E7DFCE] font-mono">
                Verified Reviews
              </span>
              <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold tracking-tight text-[#17181F]">
                Trusted by Operators & Builders
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(product.testimonials || []).map(test => (
                <div
                  key={test.id}
                  className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      {[...Array(test.rating || 5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-[#F2A93B] text-[#F2A93B]" />
                      ))}
                    </div>
                    {test.metric && (
                      <span className="rounded-full bg-[#1F8F5F]/10 text-[#1F8F5F] px-2.5 py-0.5 text-[10px] font-bold font-mono border border-[#1F8F5F]/20">
                        {test.metric}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[#17181F] leading-relaxed italic">
                    "{test.content}"
                  </p>

                  <div className="flex items-center gap-3 pt-2 border-t border-[#E7DFCE]">
                    <img
                      src={test.avatar}
                      alt={test.name}
                      className="h-8 w-8 rounded-full object-cover border border-[#E7DFCE]"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#17181F]">{test.name}</h4>
                      <p className="text-[11px] text-[#6E6C63]">{test.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQs Section */}
        {product.faqs && product.faqs.length > 0 && (
          <div className="mt-14 rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xs space-y-5">
            <div className="text-center">
              <span className="rounded-full bg-[#F3EDE0] px-3.5 py-1 text-xs font-semibold text-[#17181F] border border-[#E7DFCE] font-mono">
                Clarity & Support
              </span>
              <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold tracking-tight text-[#17181F]">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-2.5 max-w-2xl mx-auto">
              {(product.faqs || []).map(faq => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="flex w-full items-center justify-between p-4 text-left font-semibold text-[#17181F] hover:bg-[#F3EDE0] cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-bold">{faq.question}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-[#6E6C63] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="border-t border-[#E7DFCE] bg-[#FFFFFF] p-4 text-xs text-[#6E6C63] leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom CTA Card */}
        <div className="mt-14 rounded-3xl border border-[#E7DFCE] bg-[#17181F] p-8 sm:p-12 text-center text-[#FAF6EE] space-y-4 shadow-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1E202B] border border-[#31333F] px-3.5 py-1 text-xs font-semibold text-[#FFE7DD]">
            <Sparkles className="h-3.5 w-3.5 fill-[#FF5A36] text-[#FF5A36]" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Instant Access Vault</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#FAF6EE]">
            Ready to deploy {product.title}?
          </h2>

          <p className="max-w-lg mx-auto text-xs sm:text-sm text-[#A6A296] leading-relaxed">
            Join hundreds of professionals who streamline their operations with The Ngalung Atelier systems.
          </p>

          <div className="pt-2">
            <button
              id="product-bottom-buy-btn"
              type="button"
              onClick={handleCtaClick}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FF5A36] px-8 py-3.5 text-xs sm:text-sm font-bold text-[#FFFFFF] shadow-sm hover:bg-[#E64A27] transition-all cursor-pointer"
            >
              <Zap className="h-4 w-4 fill-white" />
              <span>Get Access for {currency === 'USD' ? `$${price ?? 0}` : `₹${(price ?? 0).toLocaleString('en-IN')}`}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Buy Bar (visible on scroll) */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E7DFCE] bg-[#FAF6EE]/95 px-4 py-2.5 shadow-lg backdrop-blur-md transition-all">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex items-center gap-3 truncate">
              <img
                src={product.coverImage}
                alt={product.title}
                className="h-9 w-9 shrink-0 rounded-xl object-cover border border-[#E7DFCE] hidden sm:block"
              />
              <div className="truncate">
                <h4 className="text-xs font-bold text-[#17181F] truncate">{product.title}</h4>
                <span className="text-xs font-bold text-[#FF5A36] font-mono">
                  {currency === 'USD' ? `$${price ?? 0}` : `₹${(price ?? 0).toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-[#E7DFCE] bg-[#FFFFFF] text-[#17181F] hover:bg-[#F3EDE0] shadow-2xs cursor-pointer"
                title="Share link & QR"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {isOwned ? (
                <button
                  id="sticky-access-btn"
                  type="button"
                  onClick={() => {
                    if (ownedAccessToken && onOpenVault) {
                      onOpenVault(ownedAccessToken);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-[#17181F] px-5 py-2 text-xs font-bold text-[#FAF6EE] shadow-2xs hover:bg-[#31333F] cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#FF5A36]" />
                  <span>Access Vault</span>
                </button>
              ) : (
                <button
                  id="sticky-buy-btn"
                  type="button"
                  onClick={handleCtaClick}
                  className="flex items-center gap-1.5 rounded-full bg-[#FF5A36] px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#E64A27] cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 fill-white" />
                  <span>Buy Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal product={product} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
};

export default ProductLandingPage;
