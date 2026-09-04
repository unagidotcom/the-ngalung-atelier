import React, { useState } from 'react';
import { User, Mail, Shield, KeyRound, LogOut, CheckCircle2, AlertCircle, ArrowLeft, Package, Sparkles, RefreshCw } from 'lucide-react';
import { CustomerUser } from '../types';
import { updateCustomerProfile, changeCustomerPassword, logoutCustomer } from '../lib/api';
import { LogoMark } from './LogoMark';

interface CustomerAccountProps {
  user: CustomerUser;
  onUpdateUser: (updated: CustomerUser) => void;
  onLogout: () => void;
  onNavigatePurchases: () => void;
  onNavigateHome: () => void;
}

export const CustomerAccount: React.FC<CustomerAccountProps> = ({
  user,
  onUpdateUser,
  onLogout,
  onNavigatePurchases,
  onNavigateHome
}) => {
  // Profile edit state
  const [name, setName] = useState(user.name);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Active section tab
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || name.trim().length < 2) {
      setProfileError('Please enter a valid full name.');
      return;
    }

    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const updated = await updateCustomerProfile(name.trim());
      onUpdateUser(updated);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordError('Please enter both your current and new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      await changeCustomerPassword({
        currentPassword,
        newPassword,
        confirmPassword
      });
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Please verify current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    await logoutCustomer();
    onLogout();
  };

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Active Member';

  return (
    <div className="min-h-[85vh] bg-[#FAF6EE] text-[#17181F] py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        
        {/* Navigation back and header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DFCE] pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#E7DFCE] bg-[#FFFFFF] text-[#17181F] hover:bg-[#F3EDE0] transition-colors shadow-2xs cursor-pointer"
              title="Return to Storefront"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#17181F]">
                Customer Account
              </h1>
              <p className="text-xs text-[#6E6C63]">
                Manage your credentials, personal profile, and access your digital library.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="account-view-purchases-btn"
              onClick={onNavigatePurchases}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FFE7DD] text-[#FF5A36] border border-[#FF5A36]/20 px-4 py-2 text-xs font-bold hover:bg-[#FFD7C7] transition-all cursor-pointer shadow-2xs"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>My Purchases & Vaults</span>
            </button>

            <button
              id="account-logout-btn"
              onClick={handleLogoutClick}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#6E6C63] hover:text-red-600 hover:border-red-200 transition-all cursor-pointer shadow-2xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Top User Overview Card */}
        <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#17181F] text-[#FAF6EE] font-display font-bold text-xl shadow-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-[#17181F]">
                    {user.name}
                  </h2>
                  <span className="rounded-full bg-[#1F8F5F]/10 text-[#1F8F5F] border border-[#1F8F5F]/20 px-2 py-0.5 text-[10px] font-bold uppercase font-mono">
                    Verified Customer
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#6E6C63] mt-1 font-mono">
                  <span>{user.email}</span>
                  <span>•</span>
                  <span>Member since {memberSince}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onNavigatePurchases}
                className="w-full sm:w-auto rounded-2xl bg-[#17181F] px-4 py-2.5 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Package className="h-3.5 w-3.5 text-[#FF5A36]" />
                <span>Open Digital Vault</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-[#E7DFCE] pb-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#17181F] text-[#FAF6EE] shadow-2xs'
                : 'text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F]'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[#17181F] text-[#FAF6EE] shadow-2xs'
                : 'text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F]'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Security & Password</span>
          </button>
        </div>

        {/* Tab 1: Profile Details */}
        {activeTab === 'profile' && (
          <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xs space-y-6">
            <div>
              <h3 className="font-display text-base font-bold text-[#17181F]">
                Personal Information
              </h3>
              <p className="text-xs text-[#6E6C63]">
                Your display name is attached to your orders and license certificates.
              </p>
            </div>

            {profileSuccess && (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3.5 text-xs text-red-800 border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-[#17181F] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A6A296]" />
                  <input
                    id="account-profile-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#17181F] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17181F] mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A6A296]" />
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full rounded-2xl border border-[#E7DFCE] bg-[#F3EDE0] py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#6E6C63] cursor-not-allowed opacity-80"
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#A6A296]">
                  Email address is permanently linked to your order purchase records.
                </p>
              </div>

              <div className="pt-2">
                <button
                  id="account-save-profile-btn"
                  type="submit"
                  disabled={profileLoading}
                  className="rounded-full bg-[#FF5A36] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#E64A27] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  {profileLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === 'security' && (
          <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xs space-y-6">
            <div>
              <h3 className="font-display text-base font-bold text-[#17181F]">
                Change Account Password
              </h3>
              <p className="text-xs text-[#6E6C63]">
                Ensure your account is using a secure password of at least 6 characters.
              </p>
            </div>

            {passwordSuccess && (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3.5 text-xs text-red-800 border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-[#17181F] mb-1.5">
                  Current Password
                </label>
                <input
                  id="account-current-password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] py-2.5 px-4 text-xs sm:text-sm text-[#17181F] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17181F] mb-1.5">
                  New Password <span className="text-[#A6A296] font-normal">(min. 6 characters)</span>
                </label>
                <input
                  id="account-new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] py-2.5 px-4 text-xs sm:text-sm text-[#17181F] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17181F] mb-1.5">
                  Confirm New Password
                </label>
                <input
                  id="account-confirm-new-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] py-2.5 px-4 text-xs sm:text-sm text-[#17181F] focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] focus:outline-none transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  id="account-update-password-btn"
                  type="submit"
                  disabled={passwordLoading}
                  className="rounded-full bg-[#17181F] px-6 py-2.5 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  {passwordLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default CustomerAccount;
