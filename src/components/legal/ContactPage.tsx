import React, { useState } from 'react';
import { ArrowLeft, Mail, Send, CheckCircle2, AlertCircle, HelpCircle, MessageSquare, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { PublicStoreInfo, CustomerUser } from '../../types';

interface ContactPageProps {
  storeInfo: PublicStoreInfo | null;
  customerUser?: CustomerUser | null;
  onNavigate: (view: any) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ storeInfo, customerUser, onNavigate }) => {
  const storeName = storeInfo?.storeName || 'The Ngalung Atelier';
  const supportEmail = storeInfo?.supportEmail || 'support@ngalungatelier.com';

  const [formData, setFormData] = useState({
    name: customerUser?.name || '',
    email: customerUser?.email || '',
    subject: '',
    orderNumber: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!formData.subject.trim() || formData.subject.trim().length < 3) {
      setErrorMessage('Please enter a subject for your inquiry.');
      return;
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setErrorMessage('Please provide a message with at least 10 characters so we can help.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send your message. Please try again.');
      }

      setSuccessMessage(data.message || 'Your inquiry has been received! Our support team will get back to you shortly.');
      setFormData({
        name: customerUser?.name || '',
        email: customerUser?.email || '',
        subject: '',
        orderNumber: '',
        message: ''
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Mail className="w-4 h-4" />
            <span>Help & Inquiries</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Contact & Support
          </h1>
          <p className="text-[#6E6C63] text-sm sm:text-base leading-relaxed max-w-2xl">
            Have a question regarding your template, need assistance duplicating a workspace into Notion, or have a custom inquiry?
            We are here to assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Direct Info & FAQs */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#FFFFFF] border border-[#E7DFCE] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#17181F]">Direct Support</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#FF5A36] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-[#6E6C63] uppercase tracking-wider font-mono">Email Us</div>
                    <a href={`mailto:${supportEmail}`} className="font-mono text-xs font-semibold text-[#17181F] hover:text-[#FF5A36] break-all">
                      {supportEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#1F8F5F] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-[#6E6C63] uppercase tracking-wider font-mono">Response Time</div>
                    <p className="text-xs text-[#403F3B]">Within 24–48 business hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#FF5A36] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-[#6E6C63] uppercase tracking-wider font-mono">Order Verification</div>
                    <p className="text-xs text-[#403F3B]">Include your Order # for instant lookup</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-[#FAF6EE] border border-[#E7DFCE] rounded-2xl p-6 space-y-3">
              <h4 className="font-serif text-sm font-bold text-[#17181F] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#FF5A36]" /> Quick Help
              </h4>
              <ul className="text-xs text-[#6E6C63] space-y-2">
                <li>• <strong>Accessing downloads:</strong> You can always view your purchased templates by signing in and clicking <em>My Purchases</em>.</li>
                <li>• <strong>Notion Templates:</strong> Click the duplicate link from your vault to copy the workspace directly to your Notion account.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-[#FFFFFF] border border-[#E7DFCE] rounded-2xl p-8 sm:p-10 shadow-sm">
              <h2 className="font-serif text-xl font-bold text-[#17181F] mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#FF5A36]" /> Send a Message
              </h2>

              {successMessage ? (
                <div className="p-6 bg-[#1F8F5F]/10 border border-[#1F8F5F]/20 rounded-xl space-y-4">
                  <div className="flex items-center gap-3 text-[#1F8F5F] font-semibold text-base">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Message Sent Successfully</span>
                  </div>
                  <p className="text-sm text-[#403F3B] leading-relaxed">
                    {successMessage}
                  </p>
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#1F8F5F] hover:underline cursor-pointer pt-2"
                  >
                    Send Another Message →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {errorMessage && (
                    <div className="p-4 bg-[#D94324]/10 border border-[#D94324]/20 rounded-xl flex items-start gap-3 text-[#D94324] text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#6E6C63] mb-1.5 font-medium">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="full name"
                        className="w-full px-4 py-2.5 bg-[#FAF6EE] border border-[#E7DFCE] rounded-xl text-sm text-[#17181F] placeholder:text-[#9A988E] focus:outline-none focus:ring-2 focus:ring-[#17181F]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#6E6C63] mb-1.5 font-medium">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email address"
                        className="w-full px-4 py-2.5 bg-[#FAF6EE] border border-[#E7DFCE] rounded-xl text-sm text-[#17181F] placeholder:text-[#9A988E] focus:outline-none focus:ring-2 focus:ring-[#17181F]/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#6E6C63] mb-1.5 font-medium">
                        Subject *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="subject"
                        className="w-full px-4 py-2.5 bg-[#FAF6EE] border border-[#E7DFCE] rounded-xl text-sm text-[#17181F] placeholder:text-[#9A988E] focus:outline-none focus:ring-2 focus:ring-[#17181F]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#6E6C63] mb-1.5 font-medium">
                        Order Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.orderNumber}
                        onChange={e => setFormData({ ...formData, orderNumber: e.target.value })}
                        placeholder="order number"
                        className="w-full px-4 py-2.5 bg-[#FAF6EE] border border-[#E7DFCE] rounded-xl text-sm font-mono text-[#17181F] placeholder:text-[#9A988E] focus:outline-none focus:ring-2 focus:ring-[#17181F]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#6E6C63] mb-1.5 font-medium">
                      Your Message *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we assist you with our templates or systems?"
                      className="w-full px-4 py-3 bg-[#FAF6EE] border border-[#E7DFCE] rounded-xl text-sm text-[#17181F] placeholder:text-[#9A988E] focus:outline-none focus:ring-2 focus:ring-[#17181F]/20 resize-y"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#17181F] text-[#FAF6EE] hover:bg-[#FF5A36] rounded-full text-xs font-mono uppercase tracking-wider font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Sending Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Inquiry</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
