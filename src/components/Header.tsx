import React from 'react';
import { Home, Package, Info, KeyRound, ArrowLeft, LogIn, LogOut, ShieldCheck, UserPlus, BookOpen } from 'lucide-react';
import { PublicStoreInfo, StoreSettings, CustomerUser } from '../types';
import { LogoMark } from './LogoMark';

interface HeaderProps {
  settings?: StoreSettings | PublicStoreInfo | null;
  currentView: string;
  currency: 'INR' | 'USD';
  onCurrencyChange: (c: 'INR' | 'USD') => void;
  onNavigate: (view: string, slug?: string) => void;
  selectedSlug?: string | null;
  customerUser?: CustomerUser | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentView,
  currency,
  onCurrencyChange,
  onNavigate,
  customerUser,
  onLogout
}) => {
  const storeName = settings?.storeName || 'The Ngalung Atelier';
  const tagline = settings?.storeTagline || 'Handcrafted Notion templates, docs, and spreadsheet systems';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E7DFCE] bg-[#FAF6EE]/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          {currentView !== 'store' && currentView !== 'home' && currentView !== 'welcome' && (
            <button
              id="header-back-btn"
              onClick={() => onNavigate('home')}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E7DFCE] bg-[#FFFFFF] text-[#17181F] transition-colors hover:bg-[#F3EDE0] cursor-pointer shadow-2xs"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <button
            id="brand-logo-btn"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
          >
            <LogoMark size={34} className="transition-transform group-hover:scale-105" />
            <div>
              <span className="block font-display font-bold text-base sm:text-lg text-[#17181F] tracking-tight group-hover:text-[#FF5A36] transition-colors">
                {storeName}
              </span>
              <span className="hidden text-[11px] text-[#6E6C63] sm:block truncate max-w-xs font-normal">
                {tagline}
              </span>
            </div>
          </button>
        </div>

        {/* Public Navigation Links */}
        {(
          <nav className="hidden items-center gap-1 sm:flex">
            <button
              id="nav-home-btn"
              onClick={() => onNavigate('home')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-all cursor-pointer ${
                currentView === 'home' || currentView === 'store'
                  ? 'bg-[#17181F] text-[#FAF6EE] font-bold shadow-2xs'
                  : 'text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F]'
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </button>

            <button
              id="nav-products-btn"
              onClick={() => onNavigate('products')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-all cursor-pointer ${
                currentView === 'products'
                  ? 'bg-[#17181F] text-[#FAF6EE] font-bold shadow-2xs'
                  : 'text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F]'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Products</span>
            </button>

            <button
              id="nav-articles-btn"
              onClick={() => onNavigate('articles')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-all cursor-pointer ${
                currentView === 'articles' || currentView === 'article'
                  ? 'bg-[#17181F] text-[#FAF6EE] font-bold shadow-2xs'
                  : 'text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Articles</span>
            </button>

            <button
              id="nav-about-btn"
              onClick={() => onNavigate('about')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-all cursor-pointer ${
                currentView === 'about'
                  ? 'bg-[#17181F] text-[#FAF6EE] font-bold shadow-2xs'
                  : 'text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F]'
              }`}
            >
              <Info className="h-3.5 w-3.5" />
              <span>About</span>
            </button>

            <button
              id="nav-purchases-btn"
              onClick={() => onNavigate('purchases')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-all cursor-pointer ${
                currentView === 'purchases'
                  ? 'bg-[#17181F] text-[#FAF6EE] font-bold shadow-2xs'
                  : 'text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F]'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>My Purchases</span>
            </button>
          </nav>
        )}

        {/* Right Side: Currency Selector & Customer Auth / Account Action */}
        <div className="flex items-center gap-2">
          {/* Currency Toggle */}
          <div className="flex items-center rounded-full border border-[#E7DFCE] bg-[#F3EDE0] p-0.5 text-xs font-medium text-[#6E6C63]">
            <button
              id="currency-inr-btn"
              type="button"
              onClick={() => onCurrencyChange('INR')}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition-all cursor-pointer ${
                currency === 'INR'
                  ? 'bg-[#FFFFFF] font-bold text-[#17181F] shadow-2xs'
                  : 'text-[#6E6C63] hover:text-[#17181F]'
              }`}
            >
              ₹ INR
            </button>
            <button
              id="currency-usd-btn"
              type="button"
              onClick={() => onCurrencyChange('USD')}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition-all cursor-pointer ${
                currency === 'USD'
                  ? 'bg-[#FFFFFF] font-bold text-[#17181F] shadow-2xs'
                  : 'text-[#6E6C63] hover:text-[#17181F]'
              }`}
            >
              $ USD
            </button>
          </div>

          {/* Customer Account Button (if Logged In) or Sign In / Register Buttons (if Logged Out) */}
          {customerUser ? (
            <div className="flex items-center gap-1.5">
              <button
                id="header-account-btn"
                type="button"
                onClick={() => onNavigate('account')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'account'
                    ? 'bg-[#FF5A36] text-white shadow-2xs'
                    : 'bg-[#17181F] text-[#FAF6EE] hover:bg-[#31333F] shadow-2xs'
                }`}
              >
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                  {customerUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[90px] truncate">{customerUser.name.split(' ')[0]}</span>
              </button>

              {onLogout && (
                <button
                  id="header-logout-btn"
                  type="button"
                  onClick={onLogout}
                  className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-[#E7DFCE] bg-[#FFFFFF] text-[#6E6C63] hover:text-[#17181F] hover:bg-[#F3EDE0] transition-colors cursor-pointer shadow-2xs"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                id="header-admin-login-btn"
                type="button"
                onClick={() => onNavigate('admin')}
                className={`hidden sm:flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-[#FF5A36] text-white shadow-2xs'
                    : 'border border-[#E7DFCE] bg-[#FFFFFF] text-[#17181F] hover:bg-[#F3EDE0] shadow-2xs'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#FF5A36]" />
                <span>Admin</span>
              </button>

              <button
                id="header-signin-btn"
                type="button"
                onClick={() => onNavigate('login')}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'login'
                    ? 'bg-[#17181F] text-[#FAF6EE] shadow-2xs'
                    : 'border border-[#E7DFCE] bg-[#FFFFFF] text-[#17181F] hover:bg-[#F3EDE0] shadow-2xs'
                }`}
              >
                <LogIn className="h-3.5 w-3.5 text-[#FF5A36]" />
                <span>Sign In</span>
              </button>
              
              <button
                id="header-register-btn"
                type="button"
                onClick={() => onNavigate('register')}
                className={`hidden sm:flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'register'
                    ? 'bg-[#17181F] text-[#FAF6EE] shadow-2xs'
                    : 'bg-[#17181F] text-[#FAF6EE] hover:bg-[#31333F] shadow-2xs'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5 text-white/80" />
                <span>Create Account</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Mobile Navigation Row */}
      {customerUser ? (
        <div className="flex items-center justify-around border-t border-[#E7DFCE] bg-[#FAF6EE] px-2 py-1.5 sm:hidden">
          <button
            onClick={() => onNavigate('home')}
            className={`px-2 py-1 text-xs font-semibold ${
              currentView === 'home' || currentView === 'store' ? 'text-[#17181F] font-bold' : 'text-[#6E6C63]'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('products')}
            className={`px-2 py-1 text-xs font-semibold ${
              currentView === 'products' ? 'text-[#17181F] font-bold' : 'text-[#6E6C63]'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => onNavigate('articles')}
            className={`px-2 py-1 text-xs font-semibold ${
              currentView === 'articles' || currentView === 'article' ? 'text-[#17181F] font-bold' : 'text-[#6E6C63]'
            }`}
          >
            Articles
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className={`px-2 py-1 text-xs font-semibold ${
              currentView === 'purchases' ? 'text-[#17181F] font-bold' : 'text-[#6E6C63]'
            }`}
          >
            Purchases
          </button>
          <button
            onClick={() => onNavigate('account')}
            className={`px-2 py-1 text-xs font-semibold ${
              currentView === 'account' ? 'text-[#FF5A36] font-bold' : 'text-[#17181F]'
            }`}
          >
            Account
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-2 py-1 text-xs font-semibold text-[#6E6C63] hover:text-[#17181F]"
            >
              Logout
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-around border-t border-[#E7DFCE] bg-[#FAF6EE] px-2 py-1.5 sm:hidden">
          <button
            onClick={() => onNavigate('articles')}
            className={`px-3 py-1.5 text-xs font-bold ${
              currentView === 'articles' || currentView === 'article' ? 'text-[#FF5A36]' : 'text-[#6E6C63]'
            }`}
          >
            Articles
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className={`px-3 py-1.5 text-xs font-bold ${
              currentView === 'admin' ? 'text-[#FF5A36]' : 'text-[#6E6C63]'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => onNavigate('login')}
            className={`px-3 py-1.5 text-xs font-bold ${
              currentView === 'login' ? 'text-[#FF5A36]' : 'text-[#17181F]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => onNavigate('register')}
            className={`px-3 py-1.5 text-xs font-bold ${
              currentView === 'register' ? 'text-[#FF5A36]' : 'text-[#6E6C63]'
            }`}
          >
            Create Account
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
