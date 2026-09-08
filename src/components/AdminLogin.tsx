import React, { useState } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
  Activity,
  PackageCheck,
  Users,
  Settings
} from 'lucide-react';
import { loginAdmin } from '../lib/api';
import { AdminUser } from '../types';
import { LogoMark } from './LogoMark';

interface AdminLoginProps {
  onLoginSuccess: (user: AdminUser) => void;
  onNavigateHome: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onNavigateHome
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both administrator email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await loginAdmin(email.trim(), password);
      if (response.success && response.user) {
        onLoginSuccess(response.user);
      } else {
        setError(response.message || 'Invalid administrator email or password.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid administrator email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F6F1E7] text-[#17181F]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#11151D] px-8 py-10 text-[#FAF6EE] lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(#FAF6EE 1px, transparent 1px), linear-gradient(90deg, #FAF6EE 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
          <div className="relative flex items-center gap-3">
            <LogoMark size={46} />
            <div>
              <p className="font-display text-xl font-bold">The Ngalung Atelier</p>
              <p className="text-xs text-[#AEB5C2]">Operations console</p>
            </div>
          </div>

          <div className="relative max-w-md space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#343A48] bg-[#1A202C] px-3 py-1.5 text-[11px] font-bold text-[#D8CDB4]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#32B67A]" />
              <span>Restricted admin workspace</span>
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-4xl font-bold leading-tight text-[#FAF6EE]">
                Control the storefront with confidence.
              </h1>
              <p className="text-sm leading-6 text-[#B9C0CF]">
                Manage products, customers, payments, analytics, and delivery vaults from a protected command center.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: PackageCheck, label: 'Products' },
                { icon: Users, label: 'Customers' },
                { icon: Activity, label: 'Analytics' },
                { icon: Settings, label: 'Settings' }
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-xl border border-[#303746] bg-[#171D28] px-3 py-3 text-xs font-bold text-[#DFE3EA]">
                  <Icon className="h-4 w-4 text-[#FF5A36]" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-2xl border border-[#303746] bg-[#171D28] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#AEB5C2]">Session model</span>
              <span className="font-bold text-[#69D9A0]">HMAC signed</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0D1118]">
              <div className="h-full w-4/5 rounded-full bg-[#FF5A36]" />
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <button
              type="button"
              onClick={onNavigateHome}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E2D7C4] bg-white px-3.5 py-2 text-xs font-bold text-[#5F6170] shadow-2xs transition hover:border-[#17181F] hover:text-[#17181F]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Storefront</span>
            </button>

            <div className="rounded-[28px] border border-[#E2D7C4] bg-white p-6 shadow-xl shadow-[#17181F]/10 sm:p-8">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <LogoMark size={52} />
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FBF5] px-3 py-1 text-[11px] font-bold text-[#167A50]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Secure</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-[#17181F]">
                    Admin sign in
                  </h1>
                  <p className="text-sm leading-6 text-[#666A78]">
                    Enter your administrator credentials to access the atelier management console.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="admin-email-input" className="block text-xs font-bold text-[#17181F]">
                    Admin email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8F9A]" />
                    <input
                      id="admin-email-input"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@ngalungatelier.com"
                      aria-invalid={Boolean(error)}
                      className="h-12 w-full rounded-2xl border border-[#D8CDB4] bg-[#FAF6EE] pl-10 pr-4 text-sm text-[#17181F] outline-none transition focus:border-[#17181F] focus:bg-white focus:ring-4 focus:ring-[#17181F]/10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="admin-password-input" className="block text-xs font-bold text-[#17181F]">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8F9A]" />
                    <input
                      id="admin-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter admin password"
                      aria-invalid={Boolean(error)}
                      className="h-12 w-full rounded-2xl border border-[#D8CDB4] bg-[#FAF6EE] pl-10 pr-12 text-sm text-[#17181F] outline-none transition focus:border-[#17181F] focus:bg-white focus:ring-4 focus:ring-[#17181F]/10"
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

                <button
                  id="admin-login-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#17181F] px-5 text-sm font-bold text-[#FAF6EE] shadow-lg shadow-[#17181F]/15 transition hover:bg-[#2A2D38] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-[#FF5A36]" />
                      <span>Verifying access</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-[#FF5A36]" />
                      <span>Open admin console</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col gap-3 border-t border-[#E7DFCE] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#667085]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#1F8F5F]" />
                  Token based admin session
                </span>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="text-left text-xs font-bold text-[#17181F] transition hover:text-[#FF5A36] sm:text-right"
                >
                  Return to store
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminLogin;
