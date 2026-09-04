import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ArrowRight,
  Package,
  Calendar,
  Filter,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  DashboardStats,
  AnalyticsSummary,
  AnalyticsTimeRange,
  Product,
  Order
} from '../../types';

interface DashboardOverviewProps {
  stats: DashboardStats | null;
  summary: AnalyticsSummary | null;
  products: Product[];
  orders: Order[];
  timeRange: AnalyticsTimeRange;
  onTimeRangeChange: (range: AnalyticsTimeRange, start?: string, end?: string) => void;
  onNavigateTab: (tab: 'dashboard' | 'products' | 'orders' | 'customers' | 'analytics' | 'settings') => void;
  onAddNewProduct: () => void;
  onPreviewProduct: (slug: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  summary,
  products,
  orders,
  timeRange,
  onTimeRangeChange,
  onNavigateTab,
  onAddNewProduct,
  onPreviewProduct
}) => {
  const [productSortBy, setProductSortBy] = useState<'revenue' | 'sales' | 'views' | 'conversion'>('revenue');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Derive metrics safely
  const periodRevenueINR = summary?.revenue?.currentPeriodTotal ?? stats?.totalRevenueINR ?? 0;
  const periodPaidOrders = summary?.orders?.paid ?? orders.filter(o => o.status === 'paid').length ?? 0;
  const periodVisitors = summary?.visitors?.currentPeriodTotal ?? stats?.totalVisits ?? 0;
  const periodConversionRate = summary?.conversion?.overallConversionRate ?? stats?.overallConversionRate ?? 0;
  const periodProductViews = summary?.activity?.productViews ?? stats?.topProducts?.reduce((sum, p) => sum + (p.visits || 0), 0) ?? 0;

  // Recent paid orders
  const recentPaidOrders = orders
    .filter(o => o.status === 'paid')
    .slice(0, 5);

  // Top products calculation based on sort
  const topProductsList = summary?.topProducts?.length
    ? [...summary.topProducts].sort((a, b) => {
        if (productSortBy === 'revenue') return b.revenue - a.revenue;
        if (productSortBy === 'sales') return b.salesCount - a.salesCount;
        if (productSortBy === 'views') return b.views - a.views;
        if (productSortBy === 'conversion') return b.conversionRate - a.conversionRate;
        return 0;
      })
    : products.map(p => {
        const pOrders = orders.filter(o => (o.productId === p.id || o.productSlug === p.slug) && o.status === 'paid');
        const pRevenue = pOrders.reduce((s, o) => s + (o.currency === 'USD' ? Math.round(o.amount * 85) : o.amount), 0);
        return {
          productId: p.id,
          title: p.title,
          slug: p.slug,
          category: p.category,
          views: 0,
          buyClicks: 0,
          salesCount: pOrders.length,
          revenue: pRevenue,
          revenueFormatted: `₹${pRevenue.toLocaleString('en-IN')}`,
          conversionRate: 0
        };
      }).sort((a, b) => b.revenue - a.revenue);

  // Time series for SVG chart
  const timeSeries = summary?.timeSeries || [];
  const maxRevenue = Math.max(...timeSeries.map(t => t.revenue), 1000);

  const handleCustomRangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStartDate) {
      onTimeRangeChange('custom', customStartDate, customEndDate || customStartDate);
      setShowCustomPicker(false);
    }
  };

  return (
    <div id="admin-dashboard-home" className="space-y-8">
      {/* Top Banner: Store Overview Title & Time Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time business performance, revenue, and customer activity.
          </p>
        </div>

        {/* Time Filter Controls */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'year', label: 'This Year' },
              { id: 'all', label: 'All Time' }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              id={`filter-btn-${tab.id}`}
              onClick={() => {
                setShowCustomPicker(false);
                onTimeRangeChange(tab.id);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                timeRange === tab.id && !showCustomPicker
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            id="filter-btn-custom"
            onClick={() => setShowCustomPicker(!showCustomPicker)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              showCustomPicker || timeRange === 'custom'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Custom Range</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Dropdown */}
      {showCustomPicker && (
        <form
          onSubmit={handleCustomRangeSubmit}
          className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">End Date (Optional)</label>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
          >
            Apply Range
          </button>
          <button
            type="button"
            onClick={() => setShowCustomPicker(false)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 rounded-lg"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Primary KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card (Authoritative INR) */}
        <div id="kpi-card-revenue" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Paid Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <span className="font-bold text-sm">₹</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{periodRevenueINR.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                INR
              </span>
              <span>Paid transactions only</span>
            </div>
          </div>
        </div>

        {/* Paid Orders Card */}
        <div id="kpi-card-orders" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Paid Orders</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {periodPaidOrders}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span>{orders.length} total checkout attempts</span>
            </div>
          </div>
        </div>

        {/* Visitors Card */}
        <div id="kpi-card-visitors" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Store Visitors</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {periodVisitors}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <span>{summary?.visitors?.today || 0} today • {summary?.visitors?.currentMonth || 0} this month</span>
            </div>
          </div>
        </div>

        {/* Conversion Rate Card */}
        <div id="kpi-card-conversion" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Conversion Rate</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {periodConversionRate}%
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <span>{periodProductViews} product views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart (2 columns on lg) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue & Sales Trend</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {summary?.dateRangeLabel || 'Daily revenue distribution'}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 font-medium">Revenue (₹)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 font-medium">Paid Orders</span>
              </div>
            </div>
          </div>

          {timeSeries.length > 0 ? (
            <div className="space-y-4">
              {/* Responsive SVG Chart */}
              <div className="h-48 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeWidth="1" />

                  {/* Revenue Area Gradient Fill */}
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Generate Path Coordinates */}
                  {(() => {
                    const points = timeSeries.map((t, idx) => {
                      const x = (idx / Math.max(timeSeries.length - 1, 1)) * 480 + 10;
                      const y = 130 - (t.revenue / maxRevenue) * 110;
                      return `${x},${y}`;
                    });

                    const firstX = 10;
                    const lastX = ((timeSeries.length - 1) / Math.max(timeSeries.length - 1, 1)) * 480 + 10;
                    const areaPath = `M ${firstX},130 L ${points.join(' L ')} L ${lastX},130 Z`;
                    const linePath = `M ${points.join(' L ')}`;

                    return (
                      <>
                        <path d={areaPath} fill="url(#revenueGrad)" />
                        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {timeSeries.map((t, idx) => {
                          const cx = (idx / Math.max(timeSeries.length - 1, 1)) * 480 + 10;
                          const cy = 130 - (t.revenue / maxRevenue) * 110;
                          return (
                            <g key={t.date} className="group cursor-pointer">
                              <circle
                                cx={cx}
                                cy={cy}
                                r="4"
                                fill="#ffffff"
                                stroke="#10b981"
                                strokeWidth="2.5"
                                className="transition-transform group-hover:scale-150"
                              />
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* X-Axis Date Labels */}
              <div className="flex justify-between items-center text-[10px] font-medium text-slate-400 pt-1 border-t border-slate-100">
                {timeSeries.map((t, idx) => (
                  <span key={t.date} className={idx % 2 === 0 ? 'block' : 'hidden sm:block'}>
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <BarChart3 className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-xs font-medium">No sales data recorded for this period</p>
            </div>
          )}
        </div>

        {/* Quick Actions & Store Health Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Common administrative tasks</p>

            <div className="mt-4 space-y-2.5">
              <button
                id="quick-add-product-btn"
                onClick={onAddNewProduct}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-900 transition-all font-medium text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900">Add New Product</div>
                    <div className="text-[11px] text-emerald-700">Upload asset & set price</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                id="quick-view-orders-btn"
                onClick={() => onNavigateTab('orders')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 transition-all font-medium text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900">View Orders CRM</div>
                    <div className="text-[11px] text-slate-500">{orders.length} total orders</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                id="quick-view-analytics-btn"
                onClick={() => onNavigateTab('analytics')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 transition-all font-medium text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900">Store Analytics</div>
                    <div className="text-[11px] text-slate-500">Traffic sources & funnels</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                id="quick-view-settings-btn"
                onClick={() => onNavigateTab('settings')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 transition-all font-medium text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900">Store Settings</div>
                    <div className="text-[11px] text-slate-500">Razorpay & store info</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700">Razorpay TEST MODE</span>
            </div>
            <span className="text-[11px] text-slate-400">Auth Protected</span>
          </div>
        </div>
      </div>

      {/* Top Products Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Top Products Performance</h2>
            <p className="text-xs text-slate-500 mt-0.5">Product sales, revenue generation, and conversion metrics</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Sort by:</span>
            <select
              value={productSortBy}
              onChange={e => setProductSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="revenue">Revenue Generated</option>
              <option value="sales">Units Sold</option>
              <option value="views">Total Views</option>
              <option value="conversion">Conversion Rate</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <th className="py-3 px-6">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Views</th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Revenue (INR)</th>
                <th className="py-3 px-4 text-right">Conv. Rate</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProductsList.length > 0 ? (
                topProductsList.map(item => (
                  <tr key={item.productId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[220px]">{item.title}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {item.views}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {item.salesCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                      ₹{item.revenue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                      {item.conversionRate}%
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => onPreviewProduct(item.slug || item.productId)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        <span>Preview</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No products in store catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Paid Transactions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest fulfilled customer purchases</p>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentPaidOrders.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentPaidOrders.map(order => (
              <div key={order.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>{order.buyerName}</span>
                      <span className="text-[11px] font-normal text-slate-400">({order.buyerEmail})</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {order.productTitle} • Order #{order.orderNumber}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-slate-900">
                    ₹{(order.currency === 'USD' ? Math.round(order.amount * 85) : order.amount).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(order.paidAt || order.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs">
            No completed purchases yet.
          </div>
        )}
      </div>
    </div>
  );
};
