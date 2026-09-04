import React from 'react';
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { PublicStoreInfo } from '../../types';

interface TermsPageProps {
  storeInfo: PublicStoreInfo | null;
  onNavigate: (view: any) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ storeInfo, onNavigate }) => {
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
          <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider text-[#FF5A36] mb-3">
            <FileText className="w-4 h-4" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Terms & Conditions
          </h1>
          <p className="text-[#6E6C63] text-sm sm:text-base leading-relaxed max-w-2xl">
            Please review these Terms and Conditions carefully before purchasing or utilizing any digital templates,
            systems, documents, or spreadsheet models provided by <strong className="text-[#17181F] font-semibold">{storeName}</strong>.
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
              <span className="text-[#FF5A36] text-lg font-mono">01.</span> Acceptance of Terms
            </h2>
            <p className="text-[#403F3B]">
              By creating an account, completing a checkout, or accessing digital materials hosted on {storeName},
              you confirm that you are at least 18 years of age (or have parental/guardian consent) and agree to be
              bound by these Terms and Conditions. If you do not agree, you must not purchase or use our digital assets.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">02.</span> Digital Product Description & Delivery
            </h2>
            <p className="text-[#403F3B]">
              All items provided by {storeName} are <strong>intangible digital goods</strong> delivered electronically.
              Products may include Notion workspaces, Google Sheets / Excel models, system documentation, checklists,
              and downloadable digital files.
            </p>
            <div className="bg-[#FAF6EE] border border-[#E7DFCE] rounded-xl p-4 sm:p-5 text-sm space-y-2">
              <div className="flex items-start gap-2 font-medium text-[#17181F]">
                <CheckCircle2 className="w-4 h-4 text-[#1F8F5F] shrink-0 mt-0.5" />
                <span>Instant Vault Delivery:</span>
              </div>
              <p className="text-[#6E6C63] pl-6 text-xs sm:text-sm">
                Upon verified payment confirmation, access tokens and download links are instantly generated and permanently
                attached to your authenticated customer account under <em>My Purchases</em>.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">03.</span> Customer Accounts & Access Vault
            </h2>
            <p className="text-[#403F3B]">
              To purchase and manage templates, customers register an individual account. You are responsible for
              maintaining the confidentiality of your credentials. Access tokens and digital delivery vaults are strictly
              non-transferable and assigned solely to the purchasing account.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">04.</span> License Grant & Permitted Usage
            </h2>
            <p className="text-[#403F3B]">
              Upon purchase, {storeName} grants you a non-exclusive, worldwide, perpetual, non-transferable license to use,
              customize, and implement the purchased template or system according to the following scope:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="border border-[#E7DFCE] rounded-xl p-5 bg-[#FAF6EE]">
                <div className="flex items-center gap-2 font-semibold text-[#1F8F5F] text-sm mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Permitted Uses</span>
                </div>
                <ul className="text-xs sm:text-sm text-[#6E6C63] space-y-1.5 list-disc pl-4">
                  <li>Use in personal projects and internal business operations.</li>
                  <li>Customize formulas, views, databases, and styling.</li>
                  <li>Use to manage client workflows or team operations.</li>
                </ul>
              </div>
              <div className="border border-[#E7DFCE] rounded-xl p-5 bg-[#FAF6EE]">
                <div className="flex items-center gap-2 font-semibold text-[#D94324] text-sm mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Prohibited Uses</span>
                </div>
                <ul className="text-xs sm:text-sm text-[#6E6C63] space-y-1.5 list-disc pl-4">
                  <li>Reselling, sub-licensing, or redistributing the raw templates.</li>
                  <li>Publishing duplicate links publicly or on file-sharing sites.</li>
                  <li>Claiming original author copyright or trademark.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">05.</span> Pricing, Payments & Security
            </h2>
            <p className="text-[#403F3B]">
              All product prices are quoted in Indian Rupees (INR) or US Dollars (USD) as indicated. Payments are
              processed securely via authorized payment gateways (including Razorpay).
            </p>
            <p className="text-[#6E6C63] text-sm">
              We do not store or process sensitive credit card numbers or banking passwords on our servers. All transactions
              are verified cryptographically via server-side HMAC signatures before access is unlocked.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">06.</span> Refund Policy Overview
            </h2>
            <p className="text-[#403F3B]">
              Due to the immediate digital delivery nature of our products, all sales are considered final once the digital
              asset link or file has been issued. Detailed review guidelines and eligible exceptions (such as verified duplicate billing)
              are documented in our{' '}
              <button
                onClick={() => onNavigate('refund-policy')}
                className="text-[#FF5A36] font-semibold underline hover:text-[#D94324] cursor-pointer"
              >
                Refund Policy
              </button>.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">07.</span> Intellectual Property Rights
            </h2>
            <p className="text-[#403F3B]">
              All visual designs, structural layouts, formula architectures, copy, and code are the exclusive intellectual
              property of {businessName}. Your purchase grants a license of usage, not ownership of the underlying IP.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">08.</span> Limitation of Liability
            </h2>
            <p className="text-[#403F3B]">
              Digital systems are provided &quot;as is&quot; without warranty of any kind, either express or implied.
              In no event shall {storeName} or its creators be liable for indirect, incidental, or consequential damages
              resulting from the use or inability to use the templates.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 pt-4 border-t border-[#E7DFCE]">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17181F] flex items-center gap-3">
              <span className="text-[#FF5A36] text-lg font-mono">09.</span> Contact & Inquiries
            </h2>
            <p className="text-[#403F3B]">
              If you have any questions regarding these Terms & Conditions, please contact us at:
            </p>
            <div className="bg-[#FAF6EE] border border-[#E7DFCE] rounded-xl p-5 font-mono text-sm space-y-1">
              <div><strong>Store:</strong> {storeName}</div>
              <div><strong>Support Email:</strong> <a href={`mailto:${supportEmail}`} className="text-[#FF5A36] underline">{supportEmail}</a></div>
              <div><strong>Operating Region:</strong> {country}</div>
            </div>
          </section>
        </div>

        {/* Footer Navigation CTA */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('privacy')}
            className="text-xs font-mono uppercase tracking-wider text-[#6E6C63] hover:text-[#17181F] underline cursor-pointer"
          >
            Read Privacy Policy →
          </button>
          <button
            onClick={() => onNavigate('refund-policy')}
            className="text-xs font-mono uppercase tracking-wider text-[#6E6C63] hover:text-[#17181F] underline cursor-pointer"
          >
            Read Refund Policy →
          </button>
          <button
            onClick={() => onNavigate('contact')}
            className="text-xs font-mono uppercase tracking-wider text-[#6E6C63] hover:text-[#17181F] underline cursor-pointer"
          >
            Contact Customer Support →
          </button>
        </div>
      </div>
    </div>
  );
};
