import React from 'react';
import { ShieldCheck, Zap, Lock, QrCode, Instagram, Linkedin, Twitter, Youtube, Globe } from 'lucide-react';
import { PublicStoreInfo, StoreSettings } from '../types';
import { LogoMark } from './LogoMark';

interface FooterProps {
  settings?: StoreSettings | PublicStoreInfo | null;
  onNavigate: (view: string, slug?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate }) => {
  const currentYear = new Date().getFullYear();
  const storeName = settings?.storeName || 'The Ngalung Atelier';
  const tagline = settings?.storeTagline || 'Handcrafted Notion templates, docs, and spreadsheet systems — built to save you hours.';

  return (
    <footer className="border-t border-[#E7DFCE] bg-[#F3EDE0] text-[#6E6C63]">
      {/* Value Badges Banner */}
      <div className="border-b border-[#E7DFCE] bg-[#FAF6EE] py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 rounded-2xl border border-[#E7DFCE] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFE7DD] text-[#FF5A36] border border-[#FF5A36]/20">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#17181F]">Instant Delivery Vault</p>
                <p className="text-[11px] text-[#6E6C63]">Direct asset access immediately upon payment</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[#E7DFCE] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3EDE0] text-[#17181F] border border-[#D8CDB4]">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#17181F]">UPI & Card Checkout</p>
                <p className="text-[11px] text-[#6E6C63]">Zero-friction UPI QR, GPay & Cards</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[#E7DFCE] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1F8F5F]/10 text-[#1F8F5F] border border-[#1F8F5F]/20">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#17181F]">Verified Server Access</p>
                <p className="text-[11px] text-[#6E6C63]">Signed access tokens with permanent vault</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[#E7DFCE] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2A93B]/10 text-[#F2A93B] border border-[#F2A93B]/20">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#17181F]">Lifetime Updates</p>
                <p className="text-[11px] text-[#6E6C63]">Re-enter your vault anytime via My Purchases</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1 space-y-3.5">
            <div className="flex items-center gap-3">
              <LogoMark size={32} />
              <span className="font-display font-bold text-lg text-[#17181F] tracking-tight">{storeName}</span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-[#6E6C63]">
              {tagline}
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-2 pt-1">
              {settings?.socialLinks?.instagram && (
                <a
                  href={settings.socialLinks.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E7DFCE] bg-[#FFFFFF] text-[#6E6C63] transition-colors hover:border-[#FF5A36] hover:text-[#FF5A36] shadow-2xs"
                  title="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {settings?.socialLinks?.linkedin && (
                <a
                  href={settings.socialLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E7DFCE] bg-[#FFFFFF] text-[#6E6C63] transition-colors hover:border-[#FF5A36] hover:text-[#FF5A36] shadow-2xs"
                  title="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {settings?.socialLinks?.twitter && (
                <a
                  href={settings.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E7DFCE] bg-[#FFFFFF] text-[#6E6C63] transition-colors hover:border-[#FF5A36] hover:text-[#FF5A36] shadow-2xs"
                  title="Twitter / X"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {settings?.socialLinks?.youtube && (
                <a
                  href={settings.socialLinks.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E7DFCE] bg-[#FFFFFF] text-[#6E6C63] transition-colors hover:border-[#FF5A36] hover:text-[#FF5A36] shadow-2xs"
                  title="YouTube"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              )}
              {settings?.socialLinks?.website && (
                <a
                  href={settings.socialLinks.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E7DFCE] bg-[#FFFFFF] text-[#6E6C63] transition-colors hover:border-[#FF5A36] hover:text-[#FF5A36] shadow-2xs"
                  title="Website"
                >
                  <Globe className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181F] font-mono">Store Navigation</h3>
            <ul className="mt-3.5 space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="text-[#6E6C63] hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="text-[#6E6C63] hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Products Catalog
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('articles')}
                  className="text-[#6E6C63] hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Articles
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="text-[#6E6C63] hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  About The Atelier
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181F] font-mono">Customer Vault</h3>
            <ul className="mt-3.5 space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('purchases')}
                  className="text-[#6E6C63] hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  My Purchases
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="text-[#6E6C63] hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Contact & Support
                </button>
              </li>
              <li>
                <span className="text-[#A6A296] text-[11px] block pt-1 font-mono">
                  Instant Vault Delivery & Downloads
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181F] font-mono">Legal & Compliance</h3>
            <ul className="mt-3.5 space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('terms')}
                  className="text-[#6E6C63] hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('privacy')}
                  className="text-[#6E6C63] hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('refund-policy')}
                  className="text-[#6E6C63] hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Refund & Cancellation
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[#E7DFCE] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6E6C63]">
          <p>© {currentYear} {storeName}. Handcrafted digital products & Notion systems.</p>
          <div className="flex items-center gap-4 font-mono text-[11px] text-[#A6A296]">
            <button onClick={() => onNavigate('terms')} className="hover:text-[#17181F] cursor-pointer">Terms</button>
            <span>•</span>
            <button onClick={() => onNavigate('privacy')} className="hover:text-[#17181F] cursor-pointer">Privacy</button>
            <span>•</span>
            <button onClick={() => onNavigate('refund-policy')} className="hover:text-[#17181F] cursor-pointer">Refunds</button>
            <span>•</span>
            <button onClick={() => onNavigate('contact')} className="hover:text-[#17181F] cursor-pointer">Support</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
