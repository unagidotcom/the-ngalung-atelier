import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, CheckCircle2, Server, HelpCircle } from 'lucide-react';
import { PublicStoreInfo } from '../../types';

interface PrivacyPageProps {
  storeInfo: PublicStoreInfo | null;
  onNavigate: (view: any) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ storeInfo, onNavigate }) => {
  const storeName = storeInfo?.storeName || 'The Ngalung Atelier';
  const supportEmail = storeInfo?.supportEmail || 'support@ngalungatelier.com';
  const businessName = storeInfo?.businessName || storeName;
  const country = storeInfo?.country || 'India';
  const lastUpdated = 'January 2025';

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#17181F] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('storefront')}
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#6E6C63] hover:text-[#17181F] transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Storefront
          </button>
        </div>

        {/* Header Title Card */}
        <div className="bg-[#FFFFFF] border border-[#E7DFCE] rounded-2xl p-8 sm:p-12 mb-8 shadow-sm">
          <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider text-[#1F8F5F] mb-3">
            <Shield className="w-4 h-4" />
            <span>Data Privacy & Security</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-[#6E6C63] text-sm sm:text-base leading-relaxed max-w-2xl">
            We value your trust and are committed to protecting your personal information. This Privacy Policy explains
            how <strong className="text-[#17181F] font-semibold">{storeName}</strong> collects, protects, and utilizes your data.
          </p>
          <div className="mt-6 pt-6 border-t border-[#E7DFCE] flex flex-wrap items-center justify-between text-xs text-[#6E6C63] font-mono gap-4">
            <span>Last Updated: {lastUpdated}</span>
            <span>Operating Entity: {businessName} ({country})</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="bg-[#FFFFFF] border border-[#E7DFCE] rounded-2xl p-8 sm:p-12 space-y-10 text-[#17181F] shadow-sm leading-relaxed text-sm sm:text-base">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#1F8F5F] text-lg font-mono">01.</span> Information We Collect
            </h2>
            <p className="text-[#403F3B]">
              We collect minimal information necessary to deliver your digital purchases and provide customer support:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="border border-[#E7DFCE] rounded-xl p-5 bg-[#FAF6EE]">
                <div className="font-semibold text-[#17181F] text-sm mb-1.5 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#1F8F5F]" /> Account Credentials
                </div>
                <p className="text-xs sm:text-sm text-[#6E6C63]">
                  Your full name, email address, and an encrypted password hash when you create a customer account.
                </p>
              </div>
              <div className="border border-[#E7DFCE] rounded-xl p-5 bg-[#FAF6EE]">
                <div className="font-semibold text-[#17181F] text-sm mb-1.5 flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#1F8F5F]" /> Order History
                </div>
                <p className="text-xs sm:text-sm text-[#6E6C63]">
                  Transaction references, order numbers, purchased items, and access tokens generated for your downloads.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#1F8F5F] text-lg font-mono">02.</span> Payment Security & Processing
            </h2>
            <p className="text-[#403F3B]">
              <strong>We do NOT store or process your credit card numbers, CVVs, UPI PINs, or net banking passwords.</strong>
            </p>
            <div className="bg-[#FAF6EE] border border-[#E7DFCE] rounded-xl p-5 space-y-2 text-sm text-[#6E6C63]">
              <p>
                All payments are securely processed by authorized payment gateways (including Razorpay in Test Mode).
                Transactions are validated cryptographically on our server using server-side HMAC verification before
                any download is unlocked.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#1F8F5F] text-lg font-mono">03.</span> How We Use Your Data
            </h2>
            <ul className="text-sm sm:text-base text-[#403F3B] space-y-2 list-disc pl-5">
              <li>To issue access tokens and maintain your digital products in <em>My Purchases</em>.</li>
              <li>To send order fulfillment receipts and important system updates.</li>
              <li>To respond to your support queries submitted via our contact form.</li>
              <li>To prevent fraudulent chargebacks, duplicate transactions, and unauthorized redistribution.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#1F8F5F] text-lg font-mono">04.</span> Zero Third-Party Advertising
            </h2>
            <p className="text-[#403F3B]">
              We respect your inbox and privacy. We do not sell, rent, or trade your personal information or email address
              with third-party advertisers or data brokers under any circumstances.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#1F8F5F] text-lg font-mono">05.</span> Cookies & Local Storage
            </h2>
            <p className="text-[#403F3B]">
              We utilize local storage and session tokens strictly to keep you signed in, remember your cart items,
              and authenticate your access to downloaded files. We do not use intrusive cross-site tracking cookies.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#1F8F5F] text-lg font-mono">06.</span> Your Data Rights & Deletion
            </h2>
            <p className="text-[#403F3B]">
              You have the right to request a copy of your purchase records or request account deletion. Please note that
              account deletion will permanently revoke access to your purchased digital files and vault links.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 pt-4 border-t border-[#E7DFCE]">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#1F8F5F] text-lg font-mono">07.</span> Contact Us
            </h2>
            <p className="text-[#403F3B]">
              For any privacy-related requests or questions, please contact:
            </p>
            <div className="bg-[#FAF6EE] border border-[#E7DFCE] rounded-xl p-5 font-mono text-sm space-y-1">
              <div><strong>Store:</strong> {storeName}</div>
              <div><strong>Privacy Contact:</strong> <a href={`mailto:${supportEmail}`} className="text-[#1F8F5F] underline">{supportEmail}</a></div>
              <div><strong>Country:</strong> {country}</div>
            </div>
          </section>
        </div>

        {/* Footer Navigation CTA */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('terms')}
            className="text-xs font-mono uppercase tracking-wider text-[#6E6C63] hover:text-[#17181F] underline cursor-pointer"
          >
            ← View Terms & Conditions
          </button>
          <button
            onClick={() => onNavigate('refund-policy')}
            className="text-xs font-mono uppercase tracking-wider text-[#6E6C63] hover:text-[#17181F] underline cursor-pointer"
          >
            View Refund Policy →
          </button>
          <button
            onClick={() => onNavigate('contact')}
            className="text-xs font-mono uppercase tracking-wider text-[#6E6C63] hover:text-[#17181F] underline cursor-pointer"
          >
            Contact Support →
          </button>
        </div>
      </div>
    </div>
  );
};
