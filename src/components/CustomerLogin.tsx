import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, Sparkles, UserPlus, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
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
    <div className="min-h-[80vh] bg-[#FAF6EE] text-[#17181F] py-14 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        
        {/* Back to Welcome / Storefront link */}
        <button
          onClick={onNavigateHome}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#6E6C63] hover:text-[#17181F] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="text-center space-y-2.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3EDE0] text-[#17181F] border border-[#D8CDB4] shadow-2xs">
            <LogoMark size={28} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#17181F]">
            Customer Sign In
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6C63] max-w-xs mx-auto">
            Access your purchased digital systems, Notion templates, and lifetime licenses.
          </p>
        </div>

        {/* Context Alert if redirected */}
        {redirectReason && (
          <div className="mt-6 rounded-2xl bg-[#FFE7DD] p-3 text-xs text-[#FF5A36] border border-[#FF5A36]/20 flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{redirectReason}</span>
          </div>
        )}

        {/* Login Form Card */}
        <div className="mt-6 rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#17181F] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A6A296]" />
                <input
                  id="customer-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email address"
                  className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#17181F] placeholder:text-[#A6A296] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#17181F]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(!showForgotNotice)}
                  className="text-[11px] font-medium text-[#6E6C63] hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A6A296]" />
                <input
                  id="customer-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] py-2.5 pl-10 pr-10 text-xs sm:text-sm text-[#17181F] placeholder:text-[#A6A296] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A6A296] hover:text-[#17181F] transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password info note */}
            {showForgotNotice && (
              <div className="rounded-2xl bg-[#F3EDE0] p-3 text-[11px] text-[#6E6C63] border border-[#D8CDB4] space-y-1">
                <p className="font-semibold text-[#17181F]">Password Reset Note:</p>
                <p>Password reset requires production SMTP email configuration. If you forgot your password, please contact support with your purchase receipt.</p>
              </div>
            )}

            <button
              id="customer-login-submit-btn"
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#17181F] py-3.5 text-xs sm:text-sm font-bold text-[#FAF6EE] shadow-sm hover:bg-[#31333F] disabled:opacity-50 transition-all cursor-pointer mt-2"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FAF6EE] border-t-transparent" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Redirect */}
          <div className="mt-6 border-t border-[#E7DFCE] pt-4 text-center">
            <p className="text-xs text-[#6E6C63]">
              Don&apos;t have a customer account yet?{' '}
              <button
                id="customer-login-goto-register"
                type="button"
                onClick={onNavigateRegister}
                className="font-bold text-[#FF5A36] hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>Create Account</span>
                <UserPlus className="h-3 w-3" />
              </button>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center flex items-center justify-center gap-1.5 text-[11px] text-[#A6A296]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#1F8F5F]" />
          <span>Encrypted Server-Side Customer Authentication</span>
        </div>

      </div>
    </div>
  );
};

export default CustomerLogin;
