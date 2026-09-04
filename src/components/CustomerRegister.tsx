import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, AlertCircle, ShieldCheck, ArrowLeft, LogIn, Eye, EyeOff } from 'lucide-react';
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
  onNavigateHome,
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
      setErrorMsg('Please enter your full name (at least 2 characters).');
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
      setErrorMsg('Passwords do not match. Please re-enter your password.');
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
    <div className="min-h-[80vh] bg-[#FAF6EE] text-[#17181F] py-14 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        
        {/* Back link */}
        <button
          onClick={onNavigateHome}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#6E6C63] hover:text-[#17181F] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="text-center space-y-2.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE7DD] text-[#FF5A36] border border-[#FF5A36]/20 shadow-2xs">
            <LogoMark size={28} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#17181F]">
            Create Account
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6C63] max-w-xs mx-auto">
            Organize all your digital products, lifetime updates, and invoices in one secure place.
          </p>
        </div>

        {/* Context alert if redirected */}
        {redirectReason && (
          <div className="mt-6 rounded-2xl bg-[#FFE7DD] p-3 text-xs text-[#FF5A36] border border-[#FF5A36]/20 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{redirectReason}</span>
          </div>
        )}

        {/* Register Form Card */}
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
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A6A296]" />
                <input
                  id="customer-register-name"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="full name"
                  className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#17181F] placeholder:text-[#A6A296] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17181F] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A6A296]" />
                <input
                  id="customer-register-email"
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
              <label className="block text-xs font-semibold text-[#17181F] mb-1.5">
                Password <span className="text-[#A6A296] font-normal">(min. 6 characters)</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A6A296]" />
                <input
                  id="customer-register-password"
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

            <div>
              <label className="block text-xs font-semibold text-[#17181F] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A6A296]" />
                <input
                  id="customer-register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] py-2.5 pl-10 pr-10 text-xs sm:text-sm text-[#17181F] placeholder:text-[#A6A296] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A6A296] hover:text-[#17181F] transition-colors cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              id="customer-register-submit-btn"
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#17181F] py-3.5 text-xs sm:text-sm font-bold text-[#FAF6EE] shadow-sm hover:bg-[#31333F] disabled:opacity-50 transition-all cursor-pointer mt-2"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Redirect */}
          <div className="mt-6 border-t border-[#E7DFCE] pt-4 text-center">
            <p className="text-xs text-[#6E6C63]">
              Already have a customer account?{' '}
              <button
                id="customer-register-goto-login"
                type="button"
                onClick={onNavigateLogin}
                className="font-bold text-[#FF5A36] hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>Sign In</span>
                <LogIn className="h-3 w-3" />
              </button>
            </p>
          </div>
        </div>

        {/* Password Security note */}
        <div className="mt-6 text-center text-[11px] text-[#A6A296]">
          <span>Protected with bcrypt salted password hashing and secure token sessions.</span>
        </div>

      </div>
    </div>
  );
};

export default CustomerRegister;
