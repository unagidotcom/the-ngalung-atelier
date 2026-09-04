import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Eye,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Calendar,
  RefreshCw,
  Award,
  Sparkles,
  BarChart3,
  Filter
} from 'lucide-react';
import { AnalyticsSummary, AnalyticsTimeRange, DashboardStats } from '../../types';
import { fetchAnalyticsSummary } from '../../lib/api';

interface AnalyticsOverviewProps {
  initialStats?: DashboardStats | null;
  onPreviewProduct?: (slug: string) => void;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({
  initialStats,
  onPreviewProduct
}) => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('7d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadSummary = async (range: AnalyticsTimeRange, start?: string, end?: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAnalyticsSummary(range, start, end);
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeRange === 'custom') {
      if (customStart && customEnd) {
        loadSummary('custom', customStart, customEnd);
      }
    } else {
      loadSummary(timeRange);
    }
  }, [timeRange, customStart, customEnd]);

  const handleRangeChange = (newRange: AnalyticsTimeRange) => {
    setTimeRange(newRange);
  };

  // Funnel calculations
  const totalViews = summary?.activity?.productViews || 0;
  const buyClicks = summary?.activity?.buyClicks || 0;
  const checkouts = summary?.activity?.checkoutsInitiated || 0;
  const purchases = summary?.orders?.totalOrders || 0;

  const clickThroughRate = totalViews > 0 ? ((buyClicks / totalViews) * 100).toFixed(1) : '0.0';
  const checkoutConversionRate = checkouts > 0 ? ((purchases / checkouts) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 text-[#17181F]">
      
      {/* Top Header & Range Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E7DFCE] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#17181F]">
              Sales & Traffic Intelligence
            </h2>
            <span className="rounded-full bg-[#1F8F5F]/15 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#1F8F5F]">
              ADMIN LIVE
            </span>
          </div>
          <p className="text-xs text-[#6E6C63]">
            Audited storefront metrics, real-time conversion funnels, and customer purchase analytics.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-xl border border-[#E7DFCE] bg-[#FFFFFF] p-1 shadow-2xs">
            {(
              [
                { key: 'today', label: 'Today' },
                { key: '7d', label: '7 Days' },
                { key: '30d', label: 'Month' },
                { key: 'year', label: 'Year' },
                { key: 'all', label: 'All Time' },
                { key: 'custom', label: 'Custom' }
              ] as const
            ).map(item => (
              <button
                key={item.key}
                id={`analytics-range-${item.key}`}
                type="button"
                onClick={() => handleRangeChange(item.key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  timeRange === item.key
                    ? 'bg-[#17181F] text-[#FAF6EE] shadow-xs'
                    : 'text-[#6E6C63] hover:text-[#17181F] hover:bg-[#FAF6EE]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadSummary(timeRange, customStart, customEnd)}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E7DFCE] bg-[#FFFFFF] text-[#6E6C63] hover:text-[#17181F] hover:bg-[#FAF6EE] transition-colors cursor-pointer shadow-2xs"
            title="Refresh Analytics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Picker (when 'custom' selected) */}
      {timeRange === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E7DFCE] bg-[#FFFFFF] p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-4 w-4 text-[#FF5A36]" />
            <span className="font-mono font-bold text-[#6E6C63]">Select Date Range:</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label className="font-mono text-[#6E6C63]">Start:</label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="rounded-lg border border-[#E7DFCE] bg-[#FAF6EE] px-2.5 py-1 text-xs focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label className="font-mono text-[#6E6C63]">End:</label>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="rounded-lg border border-[#E7DFCE] bg-[#FAF6EE] px-2.5 py-1 text-xs focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* 1. PRIMARY OVERVIEW CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card */}
        <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6E6C63]">
            <span className="font-medium">Gross Revenue</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF5A36]/10 text-[#FF5A36]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#17181F]">
            ₹{(summary?.revenue?.totalRevenueINR ?? initialStats?.totalRevenueINR ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#1F8F5F] font-semibold">
              ≈ ${(summary?.revenue?.totalRevenueUSD ?? initialStats?.totalRevenueUSD ?? 0).toLocaleString()} USD
            </span>
            <span className="text-[#6E6C63]">
              AOV: ₹{(summary?.revenue?.averageOrderValueINR ?? 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Paid Orders Card */}
        <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6E6C63]">
            <span className="font-medium">Completed Orders</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1F8F5F]/10 text-[#1F8F5F]">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#17181F]">
            {summary?.orders?.totalOrders ?? initialStats?.totalOrdersCount ?? 0}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#6E6C63]">
            <span>{summary?.orders?.pendingOrders ?? 0} pending</span>
            <span>{summary?.orders?.refundedOrders ?? 0} refunded</span>
          </div>
        </div>

        {/* Visitors Card */}
        <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6E6C63]">
            <span className="font-medium">Storefront Visitors</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#17181F]">
            {(summary?.visitors?.totalUniqueVisitors ?? initialStats?.totalVisits ?? 0).toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#6E6C63]">
            <span>Today: {summary?.visitors?.today ?? 0}</span>
            <span>7d: {summary?.visitors?.last7Days ?? 0}</span>
          </div>
        </div>

        {/* Overall Conversion Rate */}
        <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6E6C63]">
            <span className="font-medium">Conversion Rate</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-[#17181F]">
            {summary?.conversion?.overallConversionRate ?? initialStats?.overallConversionRate ?? '0.0'}%
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#6E6C63]">
            <span>Drop-off: {summary?.conversion?.cartAbandonmentRate ?? '0.0'}%</span>
            <span className="text-[#1F8F5F] font-semibold">Active Vaults</span>
          </div>
        </div>
      </div>

      {/* 2. CONVERSION FUNNEL & ACTIVITY BREAKDOWN */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Visual Customer Purchase Funnel */}
        <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 shadow-2xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-[#E7DFCE] pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-[#17181F]">
                Customer Checkout Funnel
              </h3>
              <p className="text-[11px] text-[#6E6C63]">
                Full journey progression from page view to digital vault unlock
              </p>
            </div>
            <span className="rounded-full bg-[#FAF6EE] border border-[#E7DFCE] px-2.5 py-0.5 font-mono text-[10px] text-[#6E6C63]">
              {timeRange.toUpperCase()}
            </span>
          </div>

          <div className="space-y-3">
            {/* Step 1: Product Views */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[#17181F]">
                  <Eye className="h-3.5 w-3.5 text-[#6E6C63]" />
                  1. Product Landing Views
                </span>
                <span className="font-mono text-[#17181F] font-bold">{totalViews.toLocaleString()}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#FAF6EE] overflow-hidden border border-[#E7DFCE]">
                <div className="h-full rounded-full bg-[#17181F] w-full" />
              </div>
            </div>

            {/* Step 2: Buy Button Clicks */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[#17181F]">
                  <MousePointerClick className="h-3.5 w-3.5 text-[#FF5A36]" />
                  2. Buy Button Clicks
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[11px] text-[#6E6C63]">({clickThroughRate}% CTR)</span>
                  <span className="text-[#17181F] font-bold">{buyClicks.toLocaleString()}</span>
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#FAF6EE] overflow-hidden border border-[#E7DFCE]">
                <div
                  className="h-full rounded-full bg-[#FF5A36] transition-all duration-500"
                  style={{ width: `${Math.max(5, Math.min(100, (buyClicks / Math.max(1, totalViews)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Step 3: Checkout Initiated */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[#17181F]">
                  <ShoppingCart className="h-3.5 w-3.5 text-amber-600" />
                  3. Checkout Modal Opened
                </span>
                <span className="font-mono text-[#17181F] font-bold">{checkouts.toLocaleString()}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#FAF6EE] overflow-hidden border border-[#E7DFCE]">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${Math.max(4, Math.min(100, (checkouts / Math.max(1, totalViews)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Step 4: Completed Purchases */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[#1F8F5F] font-bold">
                  <Award className="h-3.5 w-3.5 text-[#1F8F5F]" />
                  4. Completed Paid Orders
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[11px] text-[#1F8F5F]">({checkoutConversionRate}% of checkouts)</span>
                  <span className="text-[#1F8F5F] font-bold">{purchases.toLocaleString()}</span>
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#FAF6EE] overflow-hidden border border-[#E7DFCE]">
                <div
                  className="h-full rounded-full bg-[#1F8F5F] transition-all duration-500"
                  style={{ width: `${Math.max(3, Math.min(100, (purchases / Math.max(1, totalViews)) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E7DFCE] text-center">
            <div className="rounded-xl bg-[#FAF6EE] p-2.5">
              <div className="text-[10px] font-mono uppercase text-[#6E6C63]">Page Views</div>
              <div className="font-mono font-bold text-sm text-[#17181F]">{summary?.activity?.pageViews ?? 0}</div>
            </div>
            <div className="rounded-xl bg-[#FAF6EE] p-2.5">
              <div className="text-[10px] font-mono uppercase text-[#6E6C63]">Product Views</div>
              <div className="font-mono font-bold text-sm text-[#17181F]">{summary?.activity?.productViews ?? 0}</div>
            </div>
            <div className="rounded-xl bg-[#FAF6EE] p-2.5">
              <div className="text-[10px] font-mono uppercase text-[#6E6C63]">Intent Clicks</div>
              <div className="font-mono font-bold text-sm text-[#FF5A36]">{summary?.activity?.buyClicks ?? 0}</div>
            </div>
            <div className="rounded-xl bg-[#FAF6EE] p-2.5">
              <div className="text-[10px] font-mono uppercase text-[#6E6C63]">Successful Vaults</div>
              <div className="font-mono font-bold text-sm text-[#1F8F5F]">{summary?.orders?.totalOrders ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Traffic Sources Breakdown */}
        <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7DFCE] pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#6E6C63]" />
              <h3 className="font-display text-sm font-bold text-[#17181F]">Traffic Channels</h3>
            </div>
            <span className="font-mono text-[10px] text-[#6E6C63]">REFERRERS</span>
          </div>

          <div className="space-y-3">
            {summary?.trafficSources && summary.trafficSources.length > 0 ? (
              summary.trafficSources.map(source => (
                <div key={source.source} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium capitalize text-[#17181F] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A36]" />
                      {source.source}
                    </span>
                    <span className="font-mono text-[#6E6C63] text-[11px]">
                      {source.count} visits ({source.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#FAF6EE] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#17181F]"
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#6E6C63]">
                No traffic source data recorded yet.
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#FAF6EE] p-3 text-[11px] text-[#6E6C63] leading-relaxed border border-[#E7DFCE]">
            💡 <strong>Pro Tip:</strong> Append <code className="font-mono text-[#17181F]">?utm_source=twitter</code> or <code className="font-mono text-[#17181F]">?utm_source=newsletter</code> to your marketing links for automatic channel tracking.
          </div>
        </div>
      </div>

      {/* 3. TIME SERIES TREND CHART */}
      {summary?.timeSeries && summary.timeSeries.length > 0 && (
        <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7DFCE] pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#FF5A36]" />
              <div>
                <h3 className="font-display text-sm font-bold text-[#17181F]">
                  Daily Performance Trends
                </h3>
                <p className="text-[11px] text-[#6E6C63]">
                  Timeline of unique visitor traffic and daily revenue generation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#17181F]">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#17181F]" />
                Visitors
              </span>
              <span className="flex items-center gap-1.5 text-[#1F8F5F]">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#1F8F5F]" />
                Revenue (INR)
              </span>
            </div>
          </div>

          {/* Simple Visual Bar Columns */}
          <div className="pt-4 overflow-x-auto">
            <div className="min-w-[500px] flex items-end justify-between gap-2 h-44 pb-6 pt-2 px-2 border-b border-[#E7DFCE]">
              {(() => {
                const maxVisits = Math.max(1, ...summary.timeSeries.map(d => d.visitors));
                const maxRev = Math.max(1, ...summary.timeSeries.map(d => d.revenueINR));

                return summary.timeSeries.map((day, idx) => {
                  const visitHeight = Math.max(8, (day.visitors / maxVisits) * 110);
                  const revHeight = day.revenueINR > 0 ? Math.max(8, (day.revenueINR / maxRev) * 110) : 0;

                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#17181F] text-white text-[10px] font-mono px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-10 shadow-md">
                        {day.date}: {day.visitors ?? 0} vis | ₹{(day.revenueINR ?? 0).toLocaleString('en-IN')} ({day.orders ?? 0} ord)
                      </div>

                      <div className="flex items-end gap-1 h-32 w-full justify-center">
                        {/* Visitor bar */}
                        <div
                          style={{ height: `${visitHeight}px` }}
                          className="w-2.5 sm:w-3.5 bg-[#17181F] rounded-t-sm transition-all group-hover:bg-[#FF5A36]"
                        />
                        {/* Revenue bar */}
                        {revHeight > 0 && (
                          <div
                            style={{ height: `${revHeight}px` }}
                            className="w-2.5 sm:w-3.5 bg-[#1F8F5F] rounded-t-sm transition-all"
                          />
                        )}
                      </div>

                      <span className="text-[9px] font-mono text-[#6E6C63] truncate w-full text-center">
                        {day.date.substring(5)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 4. TOP PERFORMING PRODUCTS RANKING */}
      <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7DFCE] pb-3">
          <div>
            <h3 className="font-display text-sm font-bold text-[#17181F]">
              Top Performing Digital Products
            </h3>
            <p className="text-[11px] text-[#6E6C63]">
              Ranked by total sales volume, gross revenue, and conversion efficiency
            </p>
          </div>
          <span className="rounded-full bg-[#F3EDE0] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#17181F]">
            RANKINGS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E7DFCE] bg-[#FAF6EE] text-[11px] font-bold font-mono text-[#6E6C63]">
                <th className="p-3">Rank & Product</th>
                <th className="p-3">Views</th>
                <th className="p-3">Buy Clicks</th>
                <th className="p-3">Sales Units</th>
                <th className="p-3">Gross Revenue (INR)</th>
                <th className="p-3">Conversion</th>
                {onPreviewProduct && <th className="p-3 text-right">Preview</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFCE]">
              {summary?.topProducts && summary.topProducts.length > 0 ? (
                summary.topProducts.map((prod, index) => (
                  <tr key={prod.productId} className="hover:bg-[#FAF6EE]/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                          index === 0
                            ? 'bg-amber-400 text-amber-950 shadow-2xs'
                            : index === 1
                            ? 'bg-stone-300 text-stone-800'
                            : index === 2
                            ? 'bg-amber-700/20 text-amber-900'
                            : 'bg-[#FAF6EE] text-[#6E6C63]'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-[#17181F] max-w-xs truncate">{prod.title}</div>
                          <div className="font-mono text-[10px] text-[#A6A296]">/p/{prod.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[#6E6C63]">{(prod.views ?? 0).toLocaleString()}</td>
                    <td className="p-3 font-mono text-[#FF5A36]">{(prod.clicks ?? 0).toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-[#17181F]">{prod.salesCount ?? 0} units</td>
                    <td className="p-3 font-mono font-bold text-[#1F8F5F]">
                      ₹{(prod.revenueINR ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      <span className="rounded-full bg-[#FAF6EE] border border-[#E7DFCE] px-2 py-0.5 font-mono text-[10px] font-bold text-[#17181F]">
                        {prod.conversionRate}%
                      </span>
                    </td>
                    {onPreviewProduct && (
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => onPreviewProduct(prod.slug)}
                          className="rounded-full border border-[#E7DFCE] bg-white px-2.5 py-1 text-[10px] font-bold text-[#17181F] hover:bg-[#FAF6EE] cursor-pointer shadow-2xs inline-flex items-center gap-1"
                        >
                          <span>Storefront</span>
                          <ArrowUpRight className="h-3 w-3 text-[#FF5A36]" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-xs text-[#6E6C63]">
                    No product transactions recorded for this selected time window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
