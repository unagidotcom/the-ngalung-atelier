import React from 'react';
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Mail, Clock, HelpCircle } from 'lucide-react';
import { PublicStoreInfo } from '../../types';

interface RefundPolicyPageProps {
  storeInfo: PublicStoreInfo | null;
  onNavigate: (view: any) => void;
}

export const RefundPolicyPage: React.FC<RefundPolicyPageProps> = ({ storeInfo, onNavigate }) => {
  const storeName = storeInfo?.storeName || 'The Ngalung Atelier';
  const supportEmail = storeInfo?.supportEmail || 'support@ngalungatelier.com';
  const businessName = storeInfo?.businessName || storeName;
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
          <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider text-[#FF5A36] mb-3">
            <RefreshCw className="w-4 h-4" />
            <span>Customer Protection & Returns</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Refund & Cancellation Policy
          </h1>
          <p className="text-[#6E6C63] text-sm sm:text-base leading-relaxed max-w-2xl">
            We are committed to delivering high-quality, meticulously crafted digital systems.
            Please review our refund guidelines regarding instant-delivery digital assets.
          </p>
          <div className="mt-6 pt-6 border-t border-[#E7DFCE] flex flex-wrap items-center justify-between text-xs text-[#6E6C63] font-mono gap-4">
            <span>Last Updated: {lastUpdated}</span>
            <span>Policy Scope: All Digital Products & Notion Workspaces</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="bg-[#FFFFFF] border border-[#E7DFCE] rounded-2xl p-8 sm:p-12 space-y-10 text-[#17181F] shadow-sm leading-relaxed text-sm sm:text-base">
          
          {/* Section 1: Nature of Digital Goods */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">01.</span> Nature of Digital Goods
            </h2>
            <p className="text-[#403F3B]">
              All items sold on {storeName} are <strong>intangible digital downloads, Notion templates, and spreadsheet models</strong>.
              Unlike physical goods, digital assets are permanently accessible and can be instantly duplicated upon receipt.
            </p>
            <div className="bg-[#FAF6EE] border border-[#E7DFCE] rounded-xl p-5 border-l-4 border-l-[#FF5A36] space-y-1">
              <div className="font-semibold text-[#17181F] text-sm">General Policy Notice</div>
              <p className="text-xs sm:text-sm text-[#6E6C63]">
                Because full access to templates and downloadable files is granted immediately upon payment confirmation,
                <strong> all sales are generally considered final and non-refundable once access is unlocked.</strong>
              </p>
            </div>
          </section>

          {/* Section 2: Eligible Exceptions */}
          <section className="space-y-4">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">02.</span> Eligible Exceptions for Review
            </h2>
            <p className="text-[#403F3B]">
              We believe in fairness. We will gladly review and process refunds in the following verified circumstances:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="border border-[#E7DFCE] rounded-xl p-5 bg-[#FAF6EE] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[#1F8F5F] text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Duplicate Billing</span>
                </div>
                <p className="text-xs text-[#6E6C63] leading-relaxed">
                  You were charged multiple times for the identical product due to a network glitch or accidental double submission.
                </p>
              </div>

              <div className="border border-[#E7DFCE] rounded-xl p-5 bg-[#FAF6EE] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[#1F8F5F] text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Defective File</span>
                </div>
                <p className="text-xs text-[#6E6C63] leading-relaxed">
                  A digital file is corrupted or a Notion duplication link is broken and our support team is unable to resolve it within 48 hours.
                </p>
              </div>

              <div className="border border-[#E7DFCE] rounded-xl p-5 bg-[#FAF6EE] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[#1F8F5F] text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Gateway Discrepancy</span>
                </div>
                <p className="text-xs text-[#6E6C63] leading-relaxed">
                  Your payment was deducted by the payment gateway but the order failed to generate an access token.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Ineligible Scenarios */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">03.</span> Ineligible Circumstances
            </h2>
            <ul className="text-sm sm:text-base text-[#403F3B] space-y-2 list-disc pl-5">
              <li>Change of mind after opening, duplicating, or downloading the template.</li>
              <li>Lack of required third-party software (e.g. not having a free or paid Notion / Google account).</li>
              <li>Inability or unwillingness to customize templates to your specific needs.</li>
              <li>Purchases made during promotional sales with non-refundable terms specified.</li>
            </ul>
          </section>

          {/* Section 4: How to Request Review */}
          <section className="space-y-4">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">04.</span> How to Submit a Refund Request
            </h2>
            <div className="space-y-3 text-[#403F3B]">
              <p>
                To request an exception review, please contact our support team within <strong>7 calendar days</strong> of purchase:
              </p>
              <div className="bg-[#FAF6EE] border border-[#E7DFCE] rounded-xl p-5 font-mono text-xs sm:text-sm space-y-2">
                <div><strong>Email:</strong> <a href={`mailto:${supportEmail}`} className="text-[#FF5A36] underline">{supportEmail}</a></div>
                <div><strong>Subject Line:</strong> Refund Request — [Your Order Number]</div>
                <div><strong>Required Details:</strong> Your registered email, order number (e.g. ORD-2025-XXXX), and a brief explanation of the technical issue.</div>
              </div>
            </div>
          </section>

          {/* Section 5: Processing Time */}
          <section className="space-y-3 pt-4 border-t border-[#E7DFCE]">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">05.</span> Refund Processing Timelines
            </h2>
            <p className="text-[#403F3B]">
              Once an approved refund is authorized by our team, it is submitted to our payment processor. Funds typically
              reflect on your original payment method within <strong>5–7 business days</strong> depending on your bank.
            </p>
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
            onClick={() => onNavigate('contact')}
            className="text-xs font-mono uppercase tracking-wider text-[#6E6C63] hover:text-[#17181F] underline cursor-pointer"
          >
            Open Support Contact Form →
          </button>
        </div>
      </div>
    </div>
  );
};
