import React, { useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  ExternalLink,
  Package,
  Calendar,
  DollarSign,
  ShoppingCart,
  X,
  UserCheck,
  CheckCircle,
  Copy,
  Check
} from 'lucide-react';
import { AdminCustomer } from '../../types';

interface CustomersManagementProps {
  customers: AdminCustomer[];
  onRefreshCustomers: () => void;
}

export const CustomersManagement: React.FC<CustomersManagementProps> = ({
  customers,
  onRefreshCustomers
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const copyAccessLink = (accessToken: string) => {
    const fullUrl = `${window.location.origin}/access/${accessToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(accessToken);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div id="customers-management-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage registered customer profiles, purchase history, and lifetime store value.
          </p>
        </div>

        <button
          onClick={onRefreshCustomers}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Customers</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Total Customers: <span className="font-bold text-slate-900">{customers.length}</span>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-6">Customer</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Total Purchases</th>
                <th className="py-3 px-4 text-right">Total Spent (INR)</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(customer => (
                  <tr
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{customer.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {customer.email}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {customer.purchasesCount} {customer.purchasesCount === 1 ? 'item' : 'items'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-black text-emerald-600">
                        ₹{(customer.totalSpentINR ?? 0).toLocaleString('en-IN')}
                      </div>
                      {(customer.refundedINR ?? 0) > 0 && (
                        <div className="text-[10px] text-purple-600 font-mono">
                          Refunded: ₹{customer.refundedINR.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedCustomer(customer);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No customer accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">{selectedCustomer.name}</h2>
                  <p className="text-xs text-slate-500">{selectedCustomer.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-400 block text-[11px]">Member Since</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {new Date(selectedCustomer.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-400 block text-[11px]">Total Purchases</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {selectedCustomer.purchasesCount} orders
                  </span>
                </div>
                <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80">
                  <span className="text-emerald-700 block text-[11px]">Lifetime Spend</span>
                  <span className="font-black text-emerald-900 text-sm mt-1 block">
                    ₹{selectedCustomer.totalSpentINR.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Purchased Products History */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Purchased Products & Vault Access ({selectedCustomer.purchasedProducts.length})
                </h3>

                {selectedCustomer.purchasedProducts.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedCustomer.purchasedProducts.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{p.productTitle}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Order #{p.orderNumber} • {new Date(p.purchaseDate).toLocaleDateString('en-IN')}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span className="font-bold text-slate-900">
                            ₹{p.amountINR.toLocaleString('en-IN')}
                          </span>
                          {p.accessToken && (
                            <button
                              onClick={() => copyAccessLink(p.accessToken)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-[11px] shadow-2xs"
                            >
                              {copiedLink === p.accessToken ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-slate-500" />
                                  <span>Vault Link</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                    This customer has not completed any paid purchases yet.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
