import React from 'react';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
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
  onNavigateRegister
}) => {
  const storeName = settings?.storeName || 'The Ngalung Atelier';

  return (
    <div className="min-h-screen bg-[#0E1420] text-[#F7F1E7]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center gap-3">
          <LogoMark size={38} />
          <span className="font-display text-lg font-bold tracking-tight text-[#F7F1E7]">
            {storeName}
          </span>
        </header>

        <main className="flex flex-1 items-center justify-center py-14">
          <section className="mx-auto w-full max-w-2xl text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[22px] border border-white/15 bg-white/8 shadow-2xl shadow-black/30">
              <LogoMark size={48} />
            </div>

            <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFB49F]">
              Handcrafted Digital Products
            </p>

            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-[#F7F1E7] sm:text-5xl lg:text-6xl">
              Buy once. Own your digital systems forever.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#CFC7B8] sm:text-base">
              Welcome to {storeName}, a quiet atelier for ebooks, video courses, and templates designed for focused work.
            </p>

            <p className="mx-auto mt-3 max-w-lg text-xs leading-6 text-[#9FA8B8] sm:text-sm">
              Sign in or create a customer account to enter your private vault and access everything you purchase.
            </p>

            <div className="mx-auto mt-9 flex w-full max-w-md flex-col gap-3 rounded-[20px] border border-white/12 bg-white/7 p-3 shadow-2xl shadow-black/25 sm:flex-row">
              <button
                id="gate-customer-signin-btn"
                type="button"
                onClick={onNavigateLogin}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF6A45] px-5 text-sm font-bold text-white shadow-lg shadow-[#FF6A45]/25 transition hover:bg-[#E95732]"
              >
                <LogIn className="h-4 w-4" />
                <span>Customer Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                id="gate-customer-register-btn"
                type="button"
                onClick={onNavigateRegister}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/14 bg-[#141B2A] px-5 text-sm font-bold text-[#F7F1E7] transition hover:bg-[#1B2538]"
              >
                <UserPlus className="h-4 w-4 text-[#3ED9A5]" />
                <span>Create Account</span>
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default CustomerWelcome;
