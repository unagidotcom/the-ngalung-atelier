import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
  ShieldCheck,
  User
} from 'lucide-react';
import { CustomerUser } from '../types';
import { registerCustomer } from '../lib/api';
import { LogoMark } from './LogoMark';

interface CustomerRegisterProps {
  onRegisterSuccess: (user: CustomerUser) => void;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
  redirectReason?: string | null;
}

export const CustomerRegister: React.FC<CustomerRegisterProps> = ({
  onRegisterSuccess,
  onNavigateLogin,
  redirectReason
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || name.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await registerCustomer({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword
      });

      if (response.success && response.user) {
        onRegisterSuccess(response.user);
      } else {
        setErrorMsg(response.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create customer account.');
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
                    Create your Atelier account
                  </h1>
                  <p className="mx-auto max-w-xs text-sm leading-6 text-[#AEB8C8]">
                    Keep your ebooks, courses, templates, invoices, and lifetime updates inside one private vault.
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
                  <label htmlFor="customer-register-name" className="block text-xs font-bold text-[#F7F1E7]">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E899D]" />
                    <input
                      id="customer-register-name"
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      className="h-12 w-full rounded-2xl border border-white/12 bg-[#0E1420] pl-10 pr-4 text-sm text-[#F7F1E7] outline-none transition placeholder:text-[#667085] focus:border-[#FF6A45] focus:ring-4 focus:ring-[#FF6A45]/15"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="customer-register-email" className="block text-xs font-bold text-[#F7F1E7]">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E899D]" />
                    <input
                      id="customer-register-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-12 w-full rounded-2xl border border-white/12 bg-[#0E1420] pl-10 pr-4 text-sm text-[#F7F1E7] outline-none transition placeholder:text-[#667085] focus:border-[#FF6A45] focus:ring-4 focus:ring-[#FF6A45]/15"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="customer-register-password" className="block text-xs font-bold text-[#F7F1E7]">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E899D]" />
                    <input
                      id="customer-register-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
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

                <div className="space-y-1.5">
                  <label htmlFor="customer-register-confirm-password" className="block text-xs font-bold text-[#F7F1E7]">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E899D]" />
                    <input
                      id="customer-register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="h-12 w-full rounded-2xl border border-white/12 bg-[#0E1420] pl-10 pr-12 text-sm text-[#F7F1E7] outline-none transition placeholder:text-[#667085] focus:border-[#FF6A45] focus:ring-4 focus:ring-[#FF6A45]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#9FA8B8] transition hover:bg-white/10 hover:text-[#F7F1E7]"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="customer-register-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6A45] px-5 text-sm font-bold text-white shadow-lg shadow-[#FF6A45]/25 transition hover:bg-[#E95732] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Creating account</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  id="customer-register-goto-login"
                  type="button"
                  onClick={onNavigateLogin}
                  className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[#D8E1EF] transition hover:text-[#FFB49F]"
                >
                  <span>Already have an account? Sign in</span>
                  <LogIn className="h-4 w-4 text-[#3ED9A5]" />
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default CustomerRegister;
