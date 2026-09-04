import React, { useState } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Archive,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  Check,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Product } from '../../types';
import {
  archiveProduct,
  unpublishProduct,
  publishProduct,
  deleteProduct
} from '../../lib/api';

interface ProductManagementProps {
  products: Product[];
  onRefreshProducts: () => void;
  onEditProduct: (product: Product) => void;
  onAddNewProduct: () => void;
  onPreviewProduct: (slug: string) => void;
  onRestoreDefaults: () => void;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  products,
  onRefreshProducts,
  onEditProduct,
  onAddNewProduct,
  onPreviewProduct,
  onRestoreDefaults
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'published' | 'draft' | 'archived'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Action status message
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Deletion Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteBlockedInfo, setDeleteBlockedInfo] = useState<{
    blocked: boolean;
    reason: string;
    product: Product;
  } | null>(null);

  const filteredProducts = products.filter(p => {
    // Determine effective status
    let status: 'published' | 'draft' | 'archived' = 'draft';
    if (p.status === 'archived') status = 'archived';
    else if (p.isPublished) status = 'published';

    const matchesFilter = filterStatus === 'ALL' || status === filterStatus;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const showSuccess = (msg: string) => {
    setActionMessage(msg);
    setActionError('');
    setTimeout(() => setActionMessage(''), 4000);
  };

  const showError = (err: string) => {
    setActionError(err);
    setTimeout(() => setActionError(''), 5000);
  };

  // Quick Action: Archive
  const handleArchive = async (product: Product) => {
    setProcessingId(product.id);
    try {
      await archiveProduct(product.id);
      showSuccess(`"${product.title}" archived. It is now hidden from the storefront while existing customer access is preserved.`);
      onRefreshProducts();
    } catch (err: any) {
      showError(err.message || 'Failed to archive product');
    } finally {
      setProcessingId(null);
    }
  };

  // Quick Action: Publish
  const handlePublish = async (product: Product) => {
    setProcessingId(product.id);
    try {
      await publishProduct(product.id);
      showSuccess(`"${product.title}" is now published and live on your public storefront.`);
      onRefreshProducts();
    } catch (err: any) {
      showError(err.message || 'Failed to publish product');
    } finally {
      setProcessingId(null);
    }
  };

  // Quick Action: Unpublish (move to Draft)
  const handleUnpublish = async (product: Product) => {
    setProcessingId(product.id);
    try {
      await unpublishProduct(product.id);
      showSuccess(`"${product.title}" unpublished and moved to Draft mode.`);
      onRefreshProducts();
    } catch (err: any) {
      showError(err.message || 'Failed to unpublish product');
    } finally {
      setProcessingId(null);
    }
  };

  // Delete Action Handler
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteProduct(productToDelete.id);
      if (res.prevented) {
        setDeleteBlockedInfo({
          blocked: true,
          reason: res.message || 'Product has active customer purchase history.',
          product: productToDelete
        });
        setProductToDelete(null);
      } else {
        showSuccess(`"${productToDelete.title}" permanently deleted from catalog.`);
        setProductToDelete(null);
        onRefreshProducts();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to delete product');
      setProductToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Convert blocked deletion to archive with 1 click
  const handleArchiveInstead = async (product: Product) => {
    setDeleteBlockedInfo(null);
    await handleArchive(product);
  };

  return (
    <div className="space-y-6 text-[#17181F]">
      
      {/* Toast Feedback */}
      {actionMessage && (
        <div className="flex items-center justify-between rounded-2xl bg-[#1F8F5F] px-4 py-3 text-xs font-bold text-white shadow-md">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage('')} className="cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between rounded-2xl bg-red-600 px-4 py-3 text-xs font-bold text-white shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#17181F]">
            Product Catalog & Vault Management
          </h2>
          <p className="text-xs text-[#6E6C63]">
            Publish new digital products, modify pricing, toggle status (Publish / Draft / Archive), and manage vaults.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="restore-defaults-btn"
            type="button"
            onClick={onRestoreDefaults}
            className="rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#6E6C63] hover:bg-[#FAF6EE] cursor-pointer shadow-2xs transition-colors"
          >
            Restore Defaults
          </button>
          <button
            id="add-new-product-btn"
            type="button"
            onClick={onAddNewProduct}
            className="flex items-center gap-1.5 rounded-full bg-[#17181F] px-4 py-2 text-xs font-bold text-[#FAF6EE] shadow-2xs hover:bg-[#31333F] cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4 text-[#FF5A36]" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E7DFCE] bg-[#FFFFFF] p-3 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { key: 'ALL', label: `All (${products.length})` },
              { key: 'published', label: `Published (${products.filter(p => p.isPublished && p.status !== 'archived').length})` },
              { key: 'draft', label: `Draft (${products.filter(p => !p.isPublished && p.status !== 'archived').length})` },
              { key: 'archived', label: `Archived (${products.filter(p => p.status === 'archived').length})` }
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              id={`filter-products-${tab.key}`}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                filterStatus === tab.key
                  ? 'bg-[#17181F] text-[#FAF6EE] shadow-xs'
                  : 'text-[#6E6C63] hover:bg-[#FAF6EE] hover:text-[#17181F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6E6C63]" />
          <input
            type="text"
            placeholder="Search products or slugs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 rounded-full border border-[#E7DFCE] bg-[#FAF6EE] pl-9 pr-3 py-1.5 text-xs text-[#17181F] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Product List Table */}
      <div className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E7DFCE] bg-[#FAF6EE] text-[11px] font-bold font-mono text-[#6E6C63]">
              <th className="p-4">Digital Product</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Orders</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Lifecycle Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7DFCE]">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => {
                const isArchived = product.status === 'archived';
                const isPublished = Boolean(product.isPublished) && !isArchived;
                const isDraft = !isPublished && !isArchived;

                return (
                  <tr key={product.id} className="hover:bg-[#FAF6EE]/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.coverImage}
                          alt=""
                          className="h-10 w-14 rounded-lg object-cover border border-[#E7DFCE] bg-[#FAF6EE]"
                        />
                        <div>
                          <div className="font-bold text-[#17181F] line-clamp-1">{product.title}</div>
                          <div className="font-mono text-[11px] text-[#A6A296]">/p/{product.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-[#F3EDE0] px-2.5 py-0.5 text-[10px] font-semibold text-[#17181F]">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-[#17181F]">
                      ₹{product.priceINR} <span className="text-[#A6A296] font-normal">/ ${product.priceUSD}</span>
                    </td>
                    <td className="p-4 font-mono text-[#6E6C63]">
                      <span className="font-bold text-[#17181F]">{product.totalSalesCount}</span> sales
                    </td>
                    <td className="p-4">
                      {isArchived ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold border border-slate-200">
                          <Archive className="h-3 w-3" />
                          Archived
                        </span>
                      ) : isPublished ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#1F8F5F]/15 text-[#1F8F5F] px-2.5 py-0.5 text-[10px] font-bold">
                          <Eye className="h-3 w-3" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold">
                          <EyeOff className="h-3 w-3" />
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Preview */}
                        <button
                          type="button"
                          onClick={() => onPreviewProduct(product.slug)}
                          className="rounded-full p-1.5 text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F] cursor-pointer"
                          title="Preview Landing Page"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => onEditProduct(product)}
                          className="rounded-full p-1.5 text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F] cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* Quick Toggle Status */}
                        {isArchived ? (
                          <button
                            type="button"
                            disabled={processingId === product.id}
                            onClick={() => handlePublish(product)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#E7DFCE] bg-[#FAF6EE] px-2.5 py-1 text-[10px] font-bold text-[#1F8F5F] hover:bg-[#F3EDE0] cursor-pointer"
                            title="Restore and Publish"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Restore</span>
                          </button>
                        ) : isPublished ? (
                          <button
                            type="button"
                            disabled={processingId === product.id}
                            onClick={() => handleUnpublish(product)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#E7DFCE] bg-[#FAF6EE] px-2.5 py-1 text-[10px] font-bold text-stone-600 hover:bg-[#F3EDE0] cursor-pointer"
                            title="Unpublish (Move to Draft)"
                          >
                            <EyeOff className="h-3 w-3" />
                            <span>Unpublish</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={processingId === product.id}
                            onClick={() => handlePublish(product)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#1F8F5F]/30 bg-[#1F8F5F]/10 px-2.5 py-1 text-[10px] font-bold text-[#1F8F5F] hover:bg-[#1F8F5F]/20 cursor-pointer"
                            title="Publish Product"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Publish</span>
                          </button>
                        )}

                        {/* Archive Button */}
                        {!isArchived && (
                          <button
                            type="button"
                            disabled={processingId === product.id}
                            onClick={() => handleArchive(product)}
                            className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Archive Product"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setProductToDelete(product);
                            setDeleteBlockedInfo(null);
                          }}
                          className="rounded-full p-1.5 text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-[#6E6C63]">
                  No products found matching the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-[#17181F]/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white text-[#17181F] shadow-2xl border border-[#E7DFCE] overflow-hidden p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold text-[#17181F]">
                  Delete Product System
                </h3>
                <p className="text-xs text-[#6E6C63]">
                  Are you sure you want to permanently delete <strong className="text-[#17181F]">{productToDelete.title}</strong>?
                </p>
                <p className="text-[11px] text-[#A6A296] leading-relaxed">
                  Security Check: If this product has active customer purchases, deletion is prevented to safeguard buyer download vaults.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E7DFCE]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="rounded-full border border-[#E7DFCE] bg-white px-5 py-2 text-xs font-semibold text-[#6E6C63] hover:bg-[#FAF6EE] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Delete Product</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE BLOCKED (HAS ORDERS) MODAL WITH 1-CLICK ARCHIVE */}
      {deleteBlockedInfo && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-[#17181F]/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white text-[#17181F] shadow-2xl border border-amber-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold text-[#17181F]">
                  Permanent Deletion Prevented
                </h3>
                <p className="text-xs text-[#6E6C63]">
                  <strong className="text-[#17181F]">{deleteBlockedInfo.product.title}</strong> has active customer purchases and order history.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <span>Buyer License Protection Policy</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Permanently deleting this product would break customer access in their <strong>My Purchases</strong> vault. To hide this product from your storefront while keeping previous buyer access intact, click <strong>Archive Product</strong> below.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7DFCE]">
              <button
                type="button"
                onClick={() => setDeleteBlockedInfo(null)}
                className="rounded-full border border-[#E7DFCE] bg-white px-4 py-2 text-xs font-semibold text-[#6E6C63] hover:bg-[#FAF6EE] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleArchiveInstead(deleteBlockedInfo.product)}
                className="flex items-center gap-1.5 rounded-full bg-[#17181F] px-5 py-2 text-xs font-bold text-[#FAF6EE] shadow-md hover:bg-[#31333F] cursor-pointer transition-colors"
              >
                <Archive className="h-3.5 w-3.5 text-[#FF5A36]" />
                <span>Archive Product Instead</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
