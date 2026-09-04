import React, { useState } from 'react';
import { Lock, Mail, KeyRound, ArrowRight, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
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
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 bg-[#FAF6EE] text-[#17181F]">
      <div className="w-full max-w-md">
        
        {/* Security Badge Container */}
        <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-8 shadow-xl">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#17181F] text-[#FAF6EE] shadow-md">
              <Lock className="h-6 w-6 text-[#FF5A36]" />
            </div>
            
            <div>
              <h1 className="font-display text-2xl font-bold text-[#17181F] tracking-tight">
                Administrator Access
              </h1>
              <p className="text-xs text-[#6E6C63] mt-1">
                Authenticate with server-verified credentials to manage products, CRM, and storefront operations.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#17181F] font-mono uppercase tracking-wider">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A6A296]" />
                <input
                  id="admin-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin email"
                  className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] py-2.5 pl-10 pr-4 text-xs text-[#17181F] placeholder:text-[#A6A296] focus:border-[#17181F] focus:bg-[#FFFFFF] focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#17181F] font-mono uppercase tracking-wider">
                Master Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A6A296]" />
                <input
                  id="admin-password-input"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] py-2.5 pl-10 pr-4 text-xs text-[#17181F] placeholder:text-[#A6A296] focus:border-[#17181F] focus:bg-[#FFFFFF] focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#17181F] py-3 text-xs font-bold text-[#FAF6EE] shadow-md hover:bg-[#31333F] transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-[#FF5A36]" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="h-4 w-4 text-[#FF5A36]" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 border-t border-[#E7DFCE] pt-4 flex items-center justify-between text-[11px] text-[#A6A296]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#1F8F5F]" />
              HMAC Server Session
            </span>
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-[#6E6C63] hover:text-[#17181F] transition-colors cursor-pointer"
            >
              Return to Storefront
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminLogin;
