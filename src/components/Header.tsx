import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CircleDollarSign,
  FilePenLine,
  Home,
  Info,
  KeyRound,
  LogIn,
  LogOut,
  Package,
  ReceiptText,
  ShieldCheck,
  UserRound,
  UserPlus
} from 'lucide-react';
import { PublicStoreInfo, StoreSettings, CustomerUser } from '../types';
import { checkAdminAuth } from '../lib/api';
import { LogoMark } from './LogoMark';
import { ThreeDotMenu, ThreeDotMenuItem } from './ui/ThreeDotMenu';
import { LogoutConfirmationModal } from './ui/LogoutConfirmationModal';

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

const navItems = [
  { view: 'home', label: 'Home', icon: Home },
  { view: 'products', label: 'Products', icon: Package },
  { view: 'articles', label: 'Articles', icon: BookOpen },
  { view: 'about', label: 'About', icon: Info }
];

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentView,
  currency,
  onCurrencyChange,
  onNavigate,
  customerUser,
  onLogout
}) => {
  const [hasAdminSession, setHasAdminSession] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const storeName = settings?.storeName || 'The Ngalung Atelier';

  useEffect(() => {
    let mounted = true;
    checkAdminAuth()
      .then(user => {
        if (mounted) setHasAdminSession(Boolean(user));
      })
      .catch(() => {
        if (mounted) setHasAdminSession(false);
      });
    return () => {
      mounted = false;
    };
  }, [currentView]);

  const shouldShowBack = !['home', 'welcome'].includes(currentView);
  const menuItems: ThreeDotMenuItem[] = [
    ...(customerUser ? [
      {
        label: 'My Purchases',
        icon: <KeyRound className="h-4 w-4" />,
        onClick: () => onNavigate('purchases'),
        active: currentView === 'purchases'
      },
      {
        label: 'My Articles',
        icon: <ReceiptText className="h-4 w-4" />,
        onClick: () => onNavigate('my-articles'),
        active: currentView === 'my-articles'
      },
      {
        label: 'Write an Article',
        icon: <FilePenLine className="h-4 w-4" />,
        onClick: () => onNavigate('write-article'),
        active: currentView === 'write-article'
      }
    ] : [
      {
        label: 'Create Account',
        icon: <UserPlus className="h-4 w-4" />,
        onClick: () => onNavigate('register'),
        active: currentView === 'register'
      }
    ]),
    {
      label: currency === 'INR' ? 'Use USD pricing' : 'Use INR pricing',
      icon: <CircleDollarSign className="h-4 w-4" />,
      onClick: () => onCurrencyChange(currency === 'INR' ? 'USD' : 'INR')
    },
    {
      label: 'Contact Support',
      icon: <Info className="h-4 w-4" />,
      onClick: () => onNavigate('contact'),
      active: currentView === 'contact'
    },
    ...(hasAdminSession ? [{
      label: 'Admin Dashboard',
      icon: <ShieldCheck className="h-4 w-4" />,
      onClick: () => onNavigate('admin'),
      active: currentView === 'admin'
    }] : []),
    ...(customerUser && onLogout ? [{
      label: 'Sign Out',
      icon: <LogOut className="h-4 w-4" />,
      onClick: () => setConfirmLogout(true),
      danger: true
    }] : [])
  ];

  const handleLogoutConfirm = () => {
    setConfirmLogout(false);
    onLogout?.();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#E7DFCE] bg-[#FAF6EE]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {shouldShowBack && (
              <button
                id="header-back-btn"
                type="button"
                onClick={() => onNavigate('home')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E7DFCE] bg-white text-[#17181F] shadow-2xs transition hover:bg-[#F3EDE0]"
                title="Back to home"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <button
              id="brand-logo-btn"
              type="button"
              onClick={() => onNavigate('home')}
              className="flex min-w-0 items-center gap-3 text-left focus:outline-none"
            >
              <LogoMark size={38} />
              <span className="truncate font-display text-base font-bold tracking-tight text-[#17181F] sm:text-lg">
                {storeName}
              </span>
            </button>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ view, label, icon: Icon }) => {
              const active = currentView === view || (view === 'articles' && currentView === 'article');
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => onNavigate(view)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                    active
                      ? 'bg-[#17181F] text-[#FAF6EE]'
                      : 'text-[#5F6170] hover:bg-[#F3EDE0] hover:text-[#17181F]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {customerUser ? (
              <button
                id="header-account-btn"
                type="button"
                onClick={() => onNavigate('account')}
                className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-bold transition ${
                  currentView === 'account'
                    ? 'bg-[#FF5A36] text-white'
                    : 'bg-[#17181F] text-[#FAF6EE] hover:bg-[#31333F]'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px]">
                  {customerUser.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[92px] truncate sm:inline">{customerUser.name.split(' ')[0]}</span>
                <span className="sm:hidden">Account</span>
              </button>
            ) : (
              <button
                id="header-signin-btn"
                type="button"
                onClick={() => onNavigate('login')}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition ${
                  currentView === 'login'
                    ? 'bg-[#17181F] text-[#FAF6EE]'
                    : 'border border-[#E7DFCE] bg-white text-[#17181F] hover:bg-[#F3EDE0]'
                }`}
              >
                <LogIn className="h-3.5 w-3.5 text-[#FF5A36]" />
                <span>Sign In</span>
              </button>
            )}

            <ThreeDotMenu items={menuItems} />
          </div>
        </div>

        <div className="grid grid-cols-4 border-t border-[#E7DFCE] bg-[#FAF6EE] px-2 py-1.5 md:hidden">
          {navItems.map(({ view, label }) => {
            const active = currentView === view || (view === 'articles' && currentView === 'article');
            return (
              <button
                key={view}
                type="button"
                onClick={() => onNavigate(view)}
                className={`rounded-xl px-2 py-1.5 text-xs font-bold ${
                  active ? 'bg-[#17181F] text-[#FAF6EE]' : 'text-[#6E6C63]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>

      {confirmLogout && (
        <LogoutConfirmationModal
          onCancel={() => setConfirmLogout(false)}
          onConfirm={handleLogoutConfirm}
        />
      )}
    </>
  );
};

export default Header;
