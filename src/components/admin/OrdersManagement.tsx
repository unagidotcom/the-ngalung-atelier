import React, { useState } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  X,
  CreditCard,
  Copy,
  Check,
  Package,
  ShieldCheck,
  User,
  Phone
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import {
  resendOrderEmail,
  updateOrderStatusAdmin,
  deleteOrder
} from '../../lib/api';

interface OrdersManagementProps {
  orders: Order[];
  onRefreshOrders: () => void;
}

export const OrdersManagement: React.FC<OrdersManagementProps> = ({
  orders,
  onRefreshOrders
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setOrderStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  
  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Action Feedback
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Deletion Modal
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showSuccess = (msg: string) => {
    setActionMessage(msg);
    setActionError('');
    setTimeout(() => setActionMessage(''), 4000);
  };

  const showError = (err: string) => {
    setActionError(err);
    setTimeout(() => setActionError(''), 5000);
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(q) ||
      order.buyerName.toLowerCase().includes(q) ||
      order.buyerEmail.toLowerCase().includes(q) ||
      order.productTitle.toLowerCase().includes(q) ||
      (order.razorpayOrderId && order.razorpayOrderId.toLowerCase().includes(q)) ||
      (order.razorpayPaymentId && order.razorpayPaymentId.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  // Resend Email Handler
  const handleResendEmail = async (orderId: string) => {
    setIsProcessing(true);
    try {
      const msg = await resendOrderEmail(orderId);
      showSuccess(msg || 'Receipt and digital access email sent successfully.');
      onRefreshOrders();
    } catch (err: any) {
      showError(err.message || 'Failed to send fulfillment email');
    } finally {
      setIsProcessing(false);
    }
  };

  // Status Change Handler
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setIsProcessing(true);
    try {
      const updated = await updateOrderStatusAdmin(orderId, newStatus);
      showSuccess(`Order status updated to "${newStatus.toUpperCase()}".`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
      onRefreshOrders();
    } catch (err: any) {
      showError(err.message || 'Failed to update order status');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete Order Handler
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOrder(orderToDelete.id);
      showSuccess(`Order #${orderToDelete.orderNumber} deleted successfully.`);
      setOrderToDelete(null);
      if (selectedOrder && selectedOrder.id === orderToDelete.id) {
        setSelectedOrder(null);
      }
      onRefreshOrders();
    } catch (err: any) {
      showError(err.message || 'Failed to delete order');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyAccessLink = (accessToken: string) => {
    const fullUrl = `${window.location.origin}/access/${accessToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            PAID
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            PENDING
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            FAILED
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            REFUNDED
          </span>
        );
      case 'partially_refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            PARTIALLY REFUNDED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            CANCELLED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div id="orders-management-section" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Orders CRM</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track customer transactions, payment states, and digital product access.
          </p>
        </div>

        <button
          onClick={onRefreshOrders}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Action Messages */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-red-600 hover:text-red-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order #, email, customer..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { id: 'ALL', label: `All (${orders.length})` },
              { id: 'paid', label: `Paid (${orders.filter(o => o.status === 'paid').length})` },
              { id: 'pending', label: `Pending (${orders.filter(o => o.status === 'pending').length})` },
              { id: 'failed', label: `Failed (${orders.filter(o => o.status === 'failed').length})` },
              { id: 'refunded', label: `Refunded (${orders.filter(o => o.status === 'refunded').length})` },
              { id: 'partially_refunded', label: `Partially Refunded (${orders.filter(o => o.status === 'partially_refunded').length})` }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setOrderStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      #{order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{order.buyerName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{order.buyerEmail}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 truncate max-w-[200px]">
                        {order.productTitle}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {order.productCategory}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{(order.currency === 'USD' ? Math.round(order.amount * 85) : order.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Order Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        {order.status === 'paid' && (
                          <button
                            onClick={() => handleResendEmail(order.id)}
                            disabled={isProcessing}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Resend Access Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setOrderToDelete(order)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Order Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No orders match the selected search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">
                    Order #{selectedOrder.orderNumber}
                  </h2>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Customer Information Block */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Customer Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Full Name</span>
                    <span className="font-bold text-slate-900">{selectedOrder.buyerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Address</span>
                    <span className="font-bold text-slate-900 break-all">{selectedOrder.buyerEmail}</span>
                  </div>
                  {selectedOrder.buyerPhone && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Phone</span>
                      <span className="font-bold text-slate-900">{selectedOrder.buyerPhone}</span>
                    </div>
                  )}
                  {selectedOrder.utmSource && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Traffic Source (UTM)</span>
                      <span className="font-mono text-slate-700">{selectedOrder.utmSource}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Product & Payment Summary Block */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  <span>Purchased Product</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{selectedOrder.productTitle}</div>
                    <div className="text-slate-500 text-[11px]">{selectedOrder.productCategory}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-slate-900">
                      ₹{(selectedOrder.currency === 'USD' ? Math.round(selectedOrder.amount * 85) : selectedOrder.amount).toLocaleString('en-IN')}
                    </div>
                    {selectedOrder.currency === 'USD' && (
                      <div className="text-[10px] text-slate-400">${selectedOrder.amount} USD</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Razorpay Gateway & Verification Metadata (Strictly No Secrets) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>Payment Gateway Transaction</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Payment Method</span>
                    <span className="font-semibold text-slate-900">{selectedOrder.paymentMethod || 'RAZORPAY'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Paid At Timestamp</span>
                    <span className="font-semibold text-slate-900">
                      {selectedOrder.paidAt ? new Date(selectedOrder.paidAt).toLocaleString('en-IN') : 'Pending completion'}
                    </span>
                  </div>
                  {selectedOrder.razorpayOrderId && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">Razorpay Order ID</span>
                      <span className="font-mono text-[11px] text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                        {selectedOrder.razorpayOrderId}
                      </span>
                    </div>
                  )}
                  {selectedOrder.razorpayPaymentId && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">Razorpay Payment ID</span>
                      <span className="font-mono text-[11px] text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                        {selectedOrder.razorpayPaymentId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Refund Audit Information Block */}
              {(selectedOrder.status === 'refunded' || selectedOrder.status === 'partially_refunded' || selectedOrder.refundStatus) && (
                <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
                    <RotateCcw className="w-3.5 h-3.5 text-purple-700" />
                    <span>Refund & Revocation Information</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-purple-600 block text-[11px]">Refund Status</span>
                      <span className="font-bold text-purple-950 capitalize">{selectedOrder.refundStatus || selectedOrder.status}</span>
                    </div>
                    <div>
                      <span className="text-purple-600 block text-[11px]">Refund Amount</span>
                      <span className="font-bold text-purple-950 font-display">
                        ₹{(selectedOrder.refundAmount !== undefined ? selectedOrder.refundAmount : selectedOrder.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {selectedOrder.razorpayRefundId && (
                      <div className="sm:col-span-2">
                        <span className="text-purple-600 block text-[11px]">Razorpay Refund ID</span>
                        <span className="font-mono text-[11px] text-purple-900 bg-white px-2 py-1 rounded border border-purple-200 inline-block">
                          {selectedOrder.razorpayRefundId}
                        </span>
                      </div>
                    )}
                    {selectedOrder.refundProcessedAt && (
                      <div className="sm:col-span-2">
                        <span className="text-purple-600 block text-[11px]">Processed At</span>
                        <span className="font-mono text-[11px] text-purple-900">
                          {new Date(selectedOrder.refundProcessedAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Digital Vault Access Link Block */}
              {(selectedOrder.status === 'paid' || selectedOrder.status === 'partially_refunded') && selectedOrder.accessToken && (
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">Customer Access Link</span>
                    <button
                      onClick={() => copyAccessLink(selectedOrder.accessToken)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-2xs"
                    >
                      {copiedToken ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedToken ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700 break-all font-mono bg-white p-2 rounded-lg border border-emerald-100">
                    {window.location.origin}/access/{selectedOrder.accessToken}
                  </p>
                </div>
              )}

              {selectedOrder.status === 'refunded' && (
                <div className="bg-stone-100 p-4 rounded-2xl border border-stone-200 text-xs text-stone-600 space-y-1">
                  <span className="font-bold text-stone-800">Vault Access Revoked:</span>
                  <p>In accordance with the Refund Policy, customer downloads and vault access tokens are permanently disabled for fully refunded orders.</p>
                </div>
              )}

              {/* Status Updater */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-xs font-bold text-slate-700">Update Order Status:</span>
                <select
                  value={selectedOrder.status}
                  onChange={e => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="paid">PAID (Fulfilled)</option>
                  <option value="partially_refunded">PARTIALLY REFUNDED</option>
                  <option value="pending">PENDING</option>
                  <option value="failed">FAILED</option>
                  <option value="refunded">REFUNDED (Access Revoked)</option>
                  <option value="cancelled">CANCELLED</option>
                </select>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {selectedOrder.status === 'paid' ? (
                <button
                  onClick={() => handleResendEmail(selectedOrder.id)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Resend Access Email</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Order #{orderToDelete.orderNumber}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete this order record? This will also remove access for {orderToDelete.buyerEmail}.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
