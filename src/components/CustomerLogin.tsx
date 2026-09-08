import React, { useState } from 'react';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  UserPlus,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  BookOpen,
  Download,
  ReceiptText,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { CustomerUser } from '../types';
import { loginCustomer } from '../lib/api';
import { LogoMark } from './LogoMark';

interface CustomerLoginProps {
  onLoginSuccess: (user: CustomerUser) => void;
  onNavigateRegister: () => void;
  onNavigateHome: () => void;
  redirectReason?: string | null;
}

export const CustomerLogin: React.FC<CustomerLoginProps> = ({
  onLoginSuccess,
  onNavigateRegister,
  onNavigateHome,
  redirectReason
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await loginCustomer(email.trim(), password);
      if (response.success && response.user) {
        onLoginSuccess(response.user);
      } else {
        setErrorMsg(response.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F6F1E7] text-[#17181F]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <button
              onClick={onNavigateHome}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E2D7C4] bg-white px-3.5 py-2 text-xs font-bold text-[#5F6170] shadow-2xs transition hover:border-[#17181F] hover:text-[#17181F]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to store</span>
            </button>

            <div className="rounded-[28px] border border-[#E2D7C4] bg-white p-6 shadow-xl shadow-[#17181F]/10 sm:p-8">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <LogoMark size={52} />
                  <span className="rounded-full bg-[#FFE7DD] px-3 py-1 text-[11px] font-bold text-[#C94221]">
                    Customer vault
                  </span>
                </div>
                <div className="space-y-2">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-[#17181F]">
                    Sign in to your vault
                  </h1>
                  <p className="text-sm leading-6 text-[#666A78]">
                    Access your purchases, downloads, invoices, and lifetime product updates.
                  </p>
                </div>
              </div>

              {redirectReason && (
                <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-[#FF5A36]/20 bg-[#FFF1EA] p-3.5 text-xs font-semibold text-[#B43A1F]">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5A36]" />
                  <span>{redirectReason}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {errorMsg && (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="customer-login-email" className="block text-xs font-bold text-[#17181F]">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8F9A]" />
                    <input
                      id="customer-login-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      aria-invalid={Boolean(errorMsg)}
                      className="h-12 w-full rounded-2xl border border-[#D8CDB4] bg-[#FAF6EE] pl-10 pr-4 text-sm text-[#17181F] outline-none transition focus:border-[#FF5A36] focus:bg-white focus:ring-4 focus:ring-[#FF5A36]/10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="customer-login-password" className="block text-xs font-bold text-[#17181F]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotNotice(!showForgotNotice)}
                      className="text-[11px] font-bold text-[#6E6C63] transition hover:text-[#FF5A36]"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8F9A]" />
                    <input
                      id="customer-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password"
                      aria-invalid={Boolean(errorMsg)}
                      className="h-12 w-full rounded-2xl border border-[#D8CDB4] bg-[#FAF6EE] pl-10 pr-12 text-sm text-[#17181F] outline-none transition focus:border-[#FF5A36] focus:bg-white focus:ring-4 focus:ring-[#FF5A36]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#6E6C63] transition hover:bg-[#E7DFCE] hover:text-[#17181F]"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {showForgotNotice && (
                  <div className="rounded-2xl border border-[#D8CDB4] bg-[#FAF6EE] p-3.5 text-[11px] leading-5 text-[#656056]">
                    <p className="font-bold text-[#17181F]">Password reset</p>
                    <p>Contact support with your purchase email and receipt so the account can be verified.</p>
                  </div>
                )}

                <button
                  id="customer-login-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#17181F] px-5 text-sm font-bold text-[#FAF6EE] shadow-lg shadow-[#17181F]/15 transition hover:bg-[#2A2D38] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-[#FF5A36]" />
                      <span>Signing in</span>
                    </>
                  ) : (
                    <>
                      <span>Enter my vault</span>
                      <ArrowRight className="h-4 w-4 text-[#FF5A36]" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-[#E7DFCE] pt-5">
                <button
                  id="customer-login-goto-register"
                  type="button"
                  onClick={onNavigateRegister}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D8CDB4] bg-[#FAF6EE] px-5 py-3 text-sm font-bold text-[#17181F] transition hover:border-[#17181F] hover:bg-white"
                >
                  <UserPlus className="h-4 w-4 text-[#FF5A36]" />
                  <span>Create customer account</span>
                </button>
              </div>

              <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#7A7D89]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1F8F5F]" />
                <span>Encrypted customer session</span>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden bg-white px-8 py-10 lg:flex lg:items-center">
          <div className="w-full space-y-6">
            <div className="rounded-[28px] border border-[#E2D7C4] bg-[#11151D] p-6 text-[#FAF6EE] shadow-xl">
              <div className="flex items-center justify-between border-b border-[#2F3543] pb-5">
                <div className="flex items-center gap-3">
                  <LogoMark size={42} />
                  <div>
                    <p className="font-display text-lg font-bold">Atelier Vault</p>
                    <p className="text-xs text-[#AEB5C2]">Private delivery workspace</p>
                  </div>
                </div>
                <ShieldCheck className="h-5 w-5 text-[#32B67A]" />
              </div>

              <div className="mt-6 space-y-3">
                {[
                  { icon: Download, label: 'Downloads', detail: 'Private product files and asset packs' },
                  { icon: ReceiptText, label: 'Receipts', detail: 'Order history and payment records' },
                  { icon: KeyRound, label: 'Licenses', detail: 'Access keys and product vault links' },
                  { icon: BookOpen, label: 'Ebooks', detail: 'Guides, PDFs, EPUBs, and reference kits' }
                ].map(({ icon: Icon, label, detail }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#2F3543] bg-[#171D28] p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFE7DD] text-[#FF5A36]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#FAF6EE]">{label}</p>
                      <p className="mt-0.5 text-xs text-[#AEB5C2]">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['Secure', 'Instant', 'Persistent'].map(label => (
                <div key={label} className="rounded-2xl border border-[#E2D7C4] bg-[#FAF6EE] p-4 text-center">
                  <p className="text-xs font-bold text-[#17181F]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CustomerLogin;
