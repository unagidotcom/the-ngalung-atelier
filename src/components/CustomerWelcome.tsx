import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogIn,
  PackageCheck,
  Sparkles,
  UserPlus,
  WalletCards
} from 'lucide-react';
import { LogoMark } from './LogoMark';
import { PublicStoreInfo, StoreSettings } from '../types';

interface CustomerWelcomeProps {
  settings?: StoreSettings | PublicStoreInfo | null;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateAdmin?: () => void;
}

export const CustomerWelcome: React.FC<CustomerWelcomeProps> = ({
  settings,
  onNavigateLogin,
  onNavigateRegister
}) => {
  const storeName = settings?.storeName || 'The Ngalung Atelier';
  const tagline = settings?.storeTagline || 'Handcrafted Notion templates, docs, and spreadsheet systems';

  const systems = [
    { icon: LayoutDashboard, label: 'Operating systems', detail: 'Clean dashboards for work, content, and client delivery.' },
    { icon: BookOpen, label: 'Creator templates', detail: 'Reusable workspaces designed for launches and daily execution.' },
    { icon: FileText, label: 'Digital documents', detail: 'Guides, checklists, and reference kits delivered instantly.' }
  ];

  const trustItems = [
    'Customer accounts',
    'Private delivery vaults',
    'Order history',
    'Secure payments'
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF6EE] text-[#17181F]">
      <section className="relative overflow-hidden border-b border-[#E7DFCE] bg-[#10131A] text-[#FAF6EE]">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#FAF6EE 1px, transparent 1px), linear-gradient(90deg, #FAF6EE 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="relative mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="max-w-2xl space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#343845] bg-[#191D27] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#FFE7DD]">
              <Sparkles className="h-3.5 w-3.5 text-[#FF5A36]" />
              <span>Digital atelier for focused work</span>
            </div>

            <div className="space-y-4">
              <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-[#FAF6EE] sm:text-5xl lg:text-6xl">
                {storeName}
              </h1>
              <p className="max-w-xl text-base leading-7 text-[#C9C3B6] sm:text-lg">
                {tagline}. Buy once, sign in anytime, and keep every digital product inside a protected customer vault.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                id="homepage-signin-btn"
                type="button"
                onClick={onNavigateLogin}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FF5A36] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#E64A27]"
              >
                <LogIn className="h-4 w-4" />
                <span>Customer Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                id="homepage-register-btn"
                type="button"
                onClick={onNavigateRegister}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#3D4250] bg-[#1A1F2B] px-6 py-3.5 text-sm font-bold text-[#FAF6EE] transition hover:bg-[#252B39]"
              >
                <UserPlus className="h-4 w-4 text-[#FFE7DD]" />
                <span>Create Account</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-4">
              {trustItems.map(item => (
                <div key={item} className="flex min-h-12 items-center gap-2 rounded-lg border border-[#313746] bg-[#171B25] px-3 py-2 text-xs font-semibold text-[#D8D1C3]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#32B67A]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-8 hidden h-24 w-24 rounded-full bg-[#FF5A36]/20 blur-2xl lg:block" />
            <div className="relative overflow-hidden rounded-2xl border border-[#343845] bg-[#171B25] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#343845] px-5 py-4">
                <div className="flex items-center gap-3">
                  <LogoMark size={42} />
                  <div>
                    <p className="font-display text-base font-bold text-[#FAF6EE]">Atelier Vault</p>
                    <p className="text-xs text-[#8F96A8]">Private product delivery</p>
                  </div>
                </div>
                <div className="rounded-full bg-[#32B67A]/12 px-3 py-1 text-[11px] font-bold text-[#69D9A0]">Ready</div>
              </div>

              <div className="space-y-4 p-5">
                {systems.map(({ icon: Icon, label, detail }) => (
                  <div key={label} className="rounded-xl border border-[#343845] bg-[#111620] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFE7DD] text-[#FF5A36]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-[#FAF6EE]">{label}</h2>
                        <p className="mt-1 text-xs leading-5 text-[#9EA5B4]">{detail}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="rounded-xl bg-[#0F141D] p-3 text-center">
                    <PackageCheck className="mx-auto h-4 w-4 text-[#FF5A36]" />
                    <p className="mt-2 text-[11px] font-bold text-[#D8D1C3]">Products</p>
                  </div>
                  <div className="rounded-xl bg-[#0F141D] p-3 text-center">
                    <WalletCards className="mx-auto h-4 w-4 text-[#F2A93B]" />
                    <p className="mt-2 text-[11px] font-bold text-[#D8D1C3]">Orders</p>
                  </div>
                  <div className="rounded-xl bg-[#0F141D] p-3 text-center">
                    <KeyRound className="mx-auto h-4 w-4 text-[#32B67A]" />
                    <p className="mt-2 text-[11px] font-bold text-[#D8D1C3]">Access</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CustomerWelcome;
