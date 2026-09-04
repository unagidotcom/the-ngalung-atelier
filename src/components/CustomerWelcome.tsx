import React from 'react';
import { LogIn, UserPlus, ShieldCheck, Sparkles, PackageCheck, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { LogoMark } from './LogoMark';
import { PublicStoreInfo, StoreSettings } from '../types';

interface CustomerWelcomeProps {
  settings?: StoreSettings | PublicStoreInfo | null;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
}

export const CustomerWelcome: React.FC<CustomerWelcomeProps> = ({
  settings,
  onNavigateLogin,
  onNavigateRegister,
}) => {
  const storeName = settings?.storeName || 'The Ngalung Atelier';
  const tagline = settings?.storeTagline || 'Handcrafted Notion templates, docs, and spreadsheet systems';

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center bg-[#FAF6EE] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-lg">
        
        {/* Welcome Card Container */}
        <div className="relative overflow-hidden rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-8 sm:p-10 shadow-xs">
          
          {/* Subtle Decorative Background Element */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#FFE7DD]/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#F3EDE0]/60 blur-3xl" />

          {/* Logo & Brand Header */}
          <div className="relative text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3EDE0] text-[#17181F] border border-[#D8CDB4] shadow-2xs">
              <LogoMark size={38} />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F3EDE0] px-3 py-1 text-[11px] font-semibold text-[#6E6C63]">
                <Sparkles className="h-3 w-3 text-[#FF5A36]" />
                <span>Private Digital Storefront</span>
              </div>
              
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#17181F]">
                Welcome
              </h1>
              
              <p className="text-xs sm:text-sm text-[#6E6C63] max-w-sm mx-auto leading-relaxed">
                Sign in or create an account to explore our curated Notion templates, operating systems, and digital vaults.
              </p>
            </div>
          </div>

          {/* Core Action Buttons */}
          <div className="relative mt-8 space-y-3">
            <button
              id="welcome-signin-btn"
              type="button"
              onClick={onNavigateLogin}
              className="group flex w-full items-center justify-center gap-2.5 rounded-full bg-[#17181F] py-3.5 px-6 text-xs sm:text-sm font-bold text-[#FAF6EE] shadow-sm hover:bg-[#31333F] transition-all cursor-pointer"
            >
              <LogIn className="h-4 w-4 text-[#FF5A36] transition-transform group-hover:translate-x-0.5" />
              <span>Sign In</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              id="welcome-register-btn"
              type="button"
              onClick={onNavigateRegister}
              className="group flex w-full items-center justify-center gap-2.5 rounded-full border border-[#D8CDB4] bg-[#FAF6EE] py-3.5 px-6 text-xs sm:text-sm font-bold text-[#17181F] hover:bg-[#F3EDE0] hover:border-[#17181F] transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4 text-[#17181F]" />
              <span>Create Account</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          {/* Highlights / Features list */}
          <div className="mt-8 border-t border-[#E7DFCE] pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[#6E6C63]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#1F8F5F] shrink-0" />
                <span>Instant Digital Access</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#1F8F5F] shrink-0" />
                <span>Lifetime System Updates</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#1F8F5F] shrink-0" />
                <span>Encrypted Delivery Vaults</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#1F8F5F] shrink-0" />
                <span>Centralized Purchase History</span>
              </div>
            </div>
          </div>

        </div>

        {/* Security / Trust Footer Note */}
        <div className="mt-6 text-center flex items-center justify-center gap-1.5 text-[11px] text-[#A6A296]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#1F8F5F]" />
          <span>Secure Customer Authentication & Vault Protection</span>
        </div>

      </div>
    </div>
  );
};

export default CustomerWelcome;
