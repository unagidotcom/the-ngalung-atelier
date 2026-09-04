import React, { useState, useMemo } from 'react';
import {
  Search,
  Star,
  Zap,
  ShieldCheck,
  Share2,
  Check,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  BookOpen,
  Layers,
  Award
} from 'lucide-react';
import { Product, PublicStoreInfo, StoreSettings } from '../types';
import { ShareModal } from './ShareModal';
import { LogoMark } from './LogoMark';

interface StorefrontHomeProps {
  products: Product[];
  currency: 'INR' | 'USD';
  settings?: StoreSettings | PublicStoreInfo | null;
  onSelectProduct: (slug: string) => void;
  onBuyProduct: (product: Product) => void;
}

export const StorefrontHome: React.FC<StorefrontHomeProps> = ({
  products,
  currency,
  settings,
  onSelectProduct,
  onBuyProduct
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'price_low' | 'price_high' | 'newest'>('popular');
  const [shareProduct, setShareProduct] = useState<Product | null>(null);

  const categories: Array<{ id: string; label: string }> = [
    { id: 'ALL', label: 'All Systems' },
    { id: 'Template', label: 'Notion & Sheets' },
    { id: 'Bundle', label: 'All-Access Pass' },
    { id: 'Ebook', label: 'Legal & Docs' },
    { id: 'Code', label: 'Architecture & Code' },
    { id: 'Design', label: 'Design Tokens' }
  ];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.isPublished) return false;
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tagline.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'popular') return (b.totalSalesCount || 0) - (a.totalSalesCount || 0);
      if (sortBy === 'price_low') {
        const pA = currency === 'USD' ? a.priceUSD : a.priceINR;
        const pB = currency === 'USD' ? b.priceUSD : b.priceINR;
        return pA - pB;
      }
      if (sortBy === 'price_high') {
        const pA = currency === 'USD' ? a.priceUSD : a.priceINR;
        const pB = currency === 'USD' ? b.priceUSD : b.priceINR;
        return pB - pA;
      }
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });
  }, [products, selectedCategory, searchQuery, sortBy, currency]);

  const storeName = settings?.storeName || 'The Ngalung Atelier';
  const storeTagline = settings?.storeTagline || 'Handcrafted Notion templates, docs, and spreadsheet systems — built to save you hours.';
  const creatorBio = settings?.creatorBio || 'Dedicated to artisanal digital craftsmanship. We design calm, modular systems and templates that help consultants, founders, and creators work with clarity.';

  const scrollToCatalog = () => {
    const el = document.getElementById('products-catalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#17181F] pb-24">
      
      {/* Brand Hero Header with Ink Navy Band and Scalloped Torn-Paper Bottom Edge */}
      <section className="relative bg-[#17181F] text-[#FAF6EE] pt-14 pb-14 sm:pt-18 sm:pb-20 overflow-hidden">
        {/* Subtle geometric background watermark */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FAF6EE 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 sm:gap-12">
            
            {/* Left Brand Content */}
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#31333F] bg-[#1E202B] px-3.5 py-1 text-xs font-medium text-[#FFE7DD]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A36]" />
                <span className="font-mono uppercase tracking-wider text-[10px]">Artisanal Digital Craftsmanship</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FAF6EE] leading-[1.15]">
                Systems built to <span className="italic text-[#FF5A36]">save you hours</span> and restore calm.
              </h1>

              <p className="text-sm sm:text-base text-[#A6A296] leading-relaxed max-w-xl">
                {storeTagline}
              </p>

              {/* Call to Action */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  id="hero-browse-catalog-btn"
                  onClick={scrollToCatalog}
                  className="flex items-center gap-2 rounded-full bg-[#FF5A36] px-6 py-3 text-xs font-bold text-white hover:bg-[#E64A27] transition-all shadow-md cursor-pointer"
                >
                  <span>Explore Catalog Systems</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  id="hero-about-link-btn"
                  onClick={() => {
                    const el = document.getElementById('about-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="rounded-full border border-[#31333F] bg-[#1E202B] px-5 py-3 text-xs font-semibold text-[#FAF6EE] hover:bg-[#2A2C3A] transition-colors cursor-pointer"
                >
                  About The Atelier
                </button>
              </div>

              {/* Brand Trust Metrics */}
              <div className="flex flex-wrap items-center gap-2.5 pt-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-[#FAF6EE] bg-[#222430] border border-[#31333F] px-3 py-1.5 rounded-full">
                  <Star className="h-3.5 w-3.5 fill-[#F2A93B] text-[#F2A93B]" />
                  <span className="font-mono text-[11px]">4.95 / 5.0 Rating</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-[#FAF6EE] bg-[#222430] border border-[#31333F] px-3 py-1.5 rounded-full">
                  <Zap className="h-3.5 w-3.5 text-[#FF5A36]" />
                  <span className="font-mono text-[11px]">Instant Gated Vault</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-[#FAF6EE] bg-[#222430] border border-[#31333F] px-3 py-1.5 rounded-full">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#1F8F5F]" />
                  <span className="font-mono text-[11px]">Direct UPI & Cards</span>
                </div>
              </div>
            </div>

            {/* Right Brand Badge Showcase */}
            <div className="shrink-0 rounded-3xl border border-[#31333F] bg-[#1E202B]/80 backdrop-blur-xs p-6 flex flex-col items-center text-center w-full md:w-72 shadow-xl">
              <div className="relative mb-3.5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#222430] border border-[#31333F] text-[#FAF6EE] shadow-inner">
                  <LogoMark size={42} />
                </div>
                <div className="absolute -bottom-1 -right-1 rounded-full bg-[#1F8F5F] p-1 text-white border-2 border-[#1E202B]">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
              </div>

              <h2 className="font-display font-bold text-base text-[#FAF6EE]">The Ngalung Atelier</h2>
              <p className="text-xs text-[#A6A296] mt-0.5">Editorial Digital Studio</p>

              <div className="mt-4 w-full rounded-2xl border border-[#31333F] bg-[#17181F] p-3 text-left">
                <div className="flex items-center justify-between text-[11px] text-[#A6A296]">
                  <span>Active Catalog</span>
                  <span className="font-mono font-bold text-[#FAF6EE]">{products.filter(p => p.isPublished).length} Systems</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#A6A296]">
                  <span>Delivery Format</span>
                  <span className="font-mono font-bold text-[#FF5A36]">1-Click Vault</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Torn-paper / scallop bottom border transition */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#FAF6EE]" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 100% 0%, 98% 100%, 96% 0%, 94% 100%, 92% 0%, 90% 100%, 88% 0%, 86% 100%, 84% 0%, 82% 100%, 80% 0%, 78% 100%, 76% 0%, 74% 100%, 72% 0%, 70% 100%, 68% 0%, 66% 100%, 64% 0%, 62% 100%, 60% 0%, 58% 100%, 56% 0%, 54% 100%, 52% 0%, 50% 100%, 48% 0%, 46% 100%, 44% 0%, 42% 100%, 40% 0%, 38% 100%, 36% 0%, 34% 100%, 32% 0%, 30% 100%, 28% 0%, 26% 100%, 24% 0%, 22% 100%, 20% 0%, 18% 100%, 16% 0%, 14% 100%, 12% 0%, 10% 100%, 8% 0%, 6% 100%, 4% 0%, 2% 100%, 0% 0%)' }} />
      </section>

      {/* Main Catalog Section */}
      <div id="products-catalog" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 space-y-8">
        
        {/* Controls Bar: Categories & Search */}
        <div className="flex flex-col gap-4 border-b border-[#E7DFCE] pb-6 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map(cat => {
              const count = cat.id === 'ALL'
                ? products.filter(p => p.isPublished).length
                : products.filter(p => p.isPublished && p.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  id={`cat-btn-${cat.id.toLowerCase()}`}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#17181F] text-[#FAF6EE] shadow-2xs'
                      : 'border border-[#E7DFCE] bg-[#FFFFFF] text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F]'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
                    selectedCategory === cat.id
                      ? 'bg-[#FF5A36] text-white font-bold'
                      : 'bg-[#F3EDE0] text-[#6E6C63]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#A6A296]" />
              <input
                id="product-search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search systems..."
                className="w-full rounded-full border border-[#E7DFCE] bg-[#FFFFFF] py-1.5 pl-9 pr-4 text-xs text-[#17181F] placeholder:text-[#A6A296] focus:border-[#17181F] focus:outline-none shadow-2xs"
              />
            </div>

            <select
              id="product-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#17181F] focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="popular">Most Popular</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div>
          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#D8CDB4] bg-[#FFFFFF] p-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-[#A6A296]" />
              <h3 className="mt-3 font-display text-base font-bold text-[#17181F]">No Systems Match Your Query</h3>
              <p className="mt-1 text-xs text-[#6E6C63]">Try clearing your search term or choosing a different category filter.</p>
              <button
                type="button"
                onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
                className="mt-4 rounded-full bg-[#17181F] px-4 py-2 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F] cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map(product => {
                const price = currency === 'USD' ? product.priceUSD : product.priceINR;
                const originalPrice = currency === 'USD' ? product.originalPriceUSD : product.originalPriceINR;
                const discount = Math.round(((originalPrice - price) / originalPrice) * 100);

                return (
                  <div
                    key={product.id}
                    className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    {/* Cover image container */}
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-[#F3EDE0]">
                      <img
                        src={product.coverImage}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#17181F]/70 via-transparent to-transparent" />

                      {/* Badges */}
                      <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5">
                        <span className="rounded-full bg-[#17181F]/80 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#FAF6EE] uppercase tracking-wider border border-white/10">
                          {product.category}
                        </span>
                        {product.featured && (
                          <span className="rounded-full bg-[#FF5A36] px-2.5 py-0.5 text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                            Featured
                          </span>
                        )}
                      </div>

                      {/* Share Quick button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareProduct(product);
                        }}
                        className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#17181F]/80 text-white backdrop-blur-xs hover:bg-[#FF5A36] transition-colors cursor-pointer"
                        title="Share System Link"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col p-5">
                      
                      {/* Rating & Sales */}
                      <div className="flex items-center justify-between text-xs pb-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-[#F2A93B] text-[#F2A93B]" />
                          <span className="font-bold text-[#17181F] font-mono">{product.ratingAverage}</span>
                          <span className="text-[#A6A296] font-mono">({product.ratingCount})</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#6E6C63]">
                          {product.totalSalesCount}+ vault entries
                        </span>
                      </div>

                      {/* Title & Tagline */}
                      <div className="space-y-1">
                        <h3
                          onClick={() => onSelectProduct(product.slug)}
                          className="font-display font-bold text-base text-[#17181F] hover:text-[#FF5A36] transition-colors line-clamp-1 cursor-pointer tracking-tight"
                        >
                          {product.title}
                        </h3>
                        <p className="text-xs text-[#6E6C63] line-clamp-2 leading-relaxed">
                          {product.tagline}
                        </p>
                      </div>

                      {/* Features preview */}
                      <div className="space-y-1.5 text-xs text-[#6E6C63] pt-3">
                        {(product.features || []).slice(0, 2).map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 truncate">
                            <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#1F8F5F]/15 text-[#1F8F5F]">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </div>
                            <span className="truncate text-[11px]">{feat}</span>
                          </div>
                        ))}
                      </div>

                      {/* Signature Ticket Stub Perforation Divider */}
                      <div className="relative w-full my-4">
                        <div className="w-full border-t border-dashed border-[#D8CDB4]" />
                        <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#FAF6EE] border border-[#E7DFCE]" />
                        <div className="absolute -right-7 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#FAF6EE] border border-[#E7DFCE]" />
                      </div>

                      {/* Price Row & Action Buttons */}
                      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-display text-xl font-bold text-[#FF5A36]">
                              {currency === 'USD' ? `$${price ?? 0}` : `₹${(price ?? 0).toLocaleString('en-IN')}`}
                            </span>
                            <span className="text-xs text-[#A6A296] line-through font-mono">
                              {currency === 'USD' ? `$${originalPrice ?? 0}` : `₹${(originalPrice ?? 0).toLocaleString('en-IN')}`}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-[#1F8F5F] uppercase tracking-wider font-mono">
                            {discount}% OFF
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(product.slug)}
                            className="rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#17181F] hover:bg-[#F3EDE0] transition-colors cursor-pointer shadow-2xs"
                          >
                            Explore
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => onBuyProduct(product)}
                            className="flex items-center gap-1.5 rounded-full bg-[#FF5A36] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#E64A27] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                          >
                            <Zap className="h-3.5 w-3.5 fill-white" />
                            <span>Get</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* ABOUT SECTION */}
        {/* ========================================================= */}
        <section id="about-section" className="pt-12 border-t border-[#E7DFCE]">
          <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-8 sm:p-12 shadow-xs space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[#E7DFCE] pb-8">
              <div className="space-y-2 max-w-2xl">
                <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">
                  About The Atelier
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17181F] tracking-tight">
                  Crafting calm, modular digital tools that eliminate chaos.
                </h2>
                <p className="text-xs sm:text-sm text-[#6E6C63] leading-relaxed">
                  {creatorBio}
                </p>
              </div>

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#17181F] text-[#FAF6EE] shadow-md">
                <LogoMark size={40} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="space-y-2 rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFE7DD] text-[#FF5A36]">
                  <Layers className="h-4 w-4" />
                </div>
                <h3 className="font-display font-bold text-sm text-[#17181F]">Mathematical Hierarchy</h3>
                <p className="text-xs text-[#6E6C63] leading-relaxed">
                  Every Notion database, doc, and sheet is crafted with exact structural logic to avoid bloated setups and cognitive overload.
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F8F5F]/15 text-[#1F8F5F]">
                  <Zap className="h-4 w-4" />
                </div>
                <h3 className="font-display font-bold text-sm text-[#17181F]">Zero Setup Friction</h3>
                <p className="text-xs text-[#6E6C63] leading-relaxed">
                  No 2-hour onboarding videos. Duplicate systems directly into your personal or team workspace in under 60 seconds.
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2A93B]/15 text-[#F2A93B]">
                  <Award className="h-4 w-4" />
                </div>
                <h3 className="font-display font-bold text-sm text-[#17181F]">Lifetime Updates</h3>
                <p className="text-xs text-[#6E6C63] leading-relaxed">
                  Purchases are tied to your permanent digital vault token. As we refine formulas or schemas, you get instant access.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Share Modal */}
      {shareProduct && (
        <ShareModal product={shareProduct} onClose={() => setShareProduct(null)} />
      )}
    </div>
  );
};

export default StorefrontHome;
