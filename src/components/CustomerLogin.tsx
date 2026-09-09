import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus
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
    <div className="min-h-screen bg-[#0E1420] px-4 py-6 text-[#F7F1E7] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
        <header className="flex items-center gap-3">
          <LogoMark size={38} />
          <span className="font-display text-lg font-bold tracking-tight">
            The Ngalung Atelier
          </span>
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <section className="w-full max-w-md">
            <div className="rounded-[24px] border border-white/12 bg-[#121A2A] p-6 shadow-2xl shadow-black/35 sm:p-8">
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/12 bg-white/8">
                  <LogoMark size={42} />
                </div>
                <div className="space-y-2">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-[#F7F1E7]">
                    Welcome back to the Atelier
                  </h1>
                  <p className="mx-auto max-w-xs text-sm leading-6 text-[#AEB8C8]">
                    Sign in to access your purchased ebooks, courses, templates, invoices, and vault files.
                  </p>
                </div>
              </div>

              {redirectReason && (
                <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-[#FF6A45]/30 bg-[#FF6A45]/10 p-3.5 text-xs font-semibold text-[#FFD0C3]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3ED9A5]" />
                  <span>{redirectReason}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                {errorMsg && (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3.5 text-xs font-semibold text-red-100" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="customer-login-email" className="block text-xs font-bold text-[#F7F1E7]">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E899D]" />
                    <input
                      id="customer-login-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      aria-invalid={Boolean(errorMsg)}
                      className="h-12 w-full rounded-2xl border border-white/12 bg-[#0E1420] pl-10 pr-4 text-sm text-[#F7F1E7] outline-none transition placeholder:text-[#667085] focus:border-[#FF6A45] focus:ring-4 focus:ring-[#FF6A45]/15"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="customer-login-password" className="block text-xs font-bold text-[#F7F1E7]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotNotice(!showForgotNotice)}
                      className="text-[11px] font-bold text-[#9FA8B8] transition hover:text-[#FFB49F]"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E899D]" />
                    <input
                      id="customer-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password"
                      aria-invalid={Boolean(errorMsg)}
                      className="h-12 w-full rounded-2xl border border-white/12 bg-[#0E1420] pl-10 pr-12 text-sm text-[#F7F1E7] outline-none transition placeholder:text-[#667085] focus:border-[#FF6A45] focus:ring-4 focus:ring-[#FF6A45]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#9FA8B8] transition hover:bg-white/10 hover:text-[#F7F1E7]"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {showForgotNotice && (
                  <div className="rounded-2xl border border-white/12 bg-white/6 p-3.5 text-[11px] leading-5 text-[#AEB8C8]">
                    <p className="font-bold text-[#F7F1E7]">Password reset</p>
                    <p>Contact support with your purchase email and receipt so the account can be verified.</p>
                  </div>
                )}

                <button
                  id="customer-login-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6A45] px-5 text-sm font-bold text-white shadow-lg shadow-[#FF6A45]/25 transition hover:bg-[#E95732] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Signing in</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  id="customer-login-goto-register"
                  type="button"
                  onClick={onNavigateRegister}
                  className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[#D8E1EF] transition hover:text-[#FFB49F]"
                >
                  <span>New here? Create an account</span>
                  <UserPlus className="h-4 w-4 text-[#3ED9A5]" />
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default CustomerLogin;
