import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BookOpen,
  Check,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  FilePenLine,
  Image,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { Article, ArticleReviewStatus, ArticleStatus } from '../../types';
import {
  archiveArticle,
  deleteArticle,
  publishArticle,
  reviewArticleAdmin,
  saveArticle,
  unpublishArticle,
  uploadCoverImage
} from '../../lib/api';
import { calculateReadingTime, createArticleSlug, renderArticleMarkdown } from '../../lib/articleMarkdown';

interface ArticleManagementProps {
  articles: Article[];
  onRefreshArticles: () => void;
  onPreviewPublicArticle: (slug: string) => void;
  autoOpenWriter?: boolean;
}

const categoryOptions = [
  'Client Acquisition',
  'Freelancing',
  'Performance Marketing',
  'Artificial Intelligence',
  'Digital Business',
  'Business Growth'
];

const firstArticleDraft: Partial<Article> = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  author: 'Ng Kharinghor',
  category: 'Digital Business',
  tags: [],
  featuredImage: '',
  featuredImageAlt: '',
  primaryKeyword: '',
  secondaryKeywords: [],
  seoTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  socialShareTitle: '',
  socialShareDescription: '',
  socialShareImage: '',
  status: 'draft',
  bookCta: {
    enabled: false,
    coverImage: '',
    title: '',
    author: 'Ng Kharinghor',
    description: '',
    amazonUrl: '',
    googlePlayUrl: ''
  }
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTimeInput(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function splitCommaList(value?: string | string[]) {
  if (Array.isArray(value)) return value;
  return (value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function statusLabel(article: Article): ArticleStatus {
  return article.status || 'draft';
}

function reviewStatusLabel(status?: ArticleReviewStatus) {
  const labels: Record<string, string> = {
    draft: 'Draft',
    ready_to_submit: 'Ready',
    submitted: 'Pending Review',
    under_review: 'Under Review',
    changes_requested: 'Changes Requested',
    approved: 'Approved',
    published: 'Published',
    rejected: 'Rejected',
    archived: 'Archived'
  };
  return labels[status || 'draft'] || status || 'Draft';
}

export const ArticleManagement: React.FC<ArticleManagementProps> = ({
  articles,
  onRefreshArticles,
  onPreviewPublicArticle,
  autoOpenWriter = false
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | ArticleStatus | 'CUSTOMER_REVIEW' | 'SCHEDULED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [previewArticle, setPreviewArticle] = useState<Partial<Article> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const autoOpenedWriterRef = useRef(false);

  useEffect(() => {
    if (autoOpenWriter && !autoOpenedWriterRef.current) {
      autoOpenedWriterRef.current = true;
      setEditingArticle({ ...firstArticleDraft });
      setError('');
    }
  }, [autoOpenWriter]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter(article => {
      const matchesStatus = filterStatus === 'ALL'
        || statusLabel(article) === filterStatus
        || (filterStatus === 'CUSTOMER_REVIEW' && article.source === 'customer' && ['submitted', 'under_review', 'changes_requested', 'approved', 'rejected'].includes(article.reviewStatus || 'draft'))
        || (filterStatus === 'SCHEDULED' && Boolean(article.scheduledAt));
      const matchesSearch = !q ||
        article.title.toLowerCase().includes(q) ||
        article.slug.toLowerCase().includes(q) ||
        article.category.toLowerCase().includes(q) ||
        (article.tags || []).some(tag => tag.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [articles, filterStatus, searchQuery]);

  const showMessage = (value: string) => {
    setMessage(value);
    setError('');
    setTimeout(() => setMessage(''), 4000);
  };

  const showError = (value: string) => {
    setError(value);
    setTimeout(() => setError(''), 5000);
  };

  const updateEditingArticle = (patch: Partial<Article>) => {
    setEditingArticle(current => current ? { ...current, ...patch } : current);
  };

  const handleNewArticle = () => {
    setEditingArticle({ ...firstArticleDraft });
    setError('');
  };

  const handleUploadFeaturedImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadCoverImage(file);
      updateEditingArticle({
        featuredImage: uploaded.url,
        ogImage: uploaded.url,
        socialShareImage: uploaded.url
      });
      showMessage('Featured image uploaded.');
    } catch (err: any) {
      showError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSave = async (status?: ArticleStatus) => {
    if (!editingArticle?.title?.trim()) {
      showError('Article title is required.');
      return;
    }
    setSaving(true);
    try {
      const nextArticle: Partial<Article> = {
        ...editingArticle,
        status: status || editingArticle.status || 'draft',
        slug: createArticleSlug(editingArticle.slug || editingArticle.title || ''),
        tags: splitCommaList(editingArticle.tags),
        secondaryKeywords: splitCommaList(editingArticle.secondaryKeywords),
        ogTitle: editingArticle.ogTitle || editingArticle.seoTitle || editingArticle.title,
        ogDescription: editingArticle.ogDescription || editingArticle.metaDescription || editingArticle.excerpt,
        ogImage: editingArticle.ogImage || editingArticle.featuredImage,
        socialShareTitle: editingArticle.socialShareTitle || editingArticle.ogTitle || editingArticle.seoTitle || editingArticle.title,
        socialShareDescription: editingArticle.socialShareDescription || editingArticle.ogDescription || editingArticle.metaDescription || editingArticle.excerpt,
        socialShareImage: editingArticle.socialShareImage || editingArticle.ogImage || editingArticle.featuredImage
      };
      const saved = await saveArticle(nextArticle);
      setEditingArticle(saved);
      onRefreshArticles();
      showMessage(status === 'published' ? 'Article published.' : 'Article saved.');
    } catch (err: any) {
      showError(err.message || 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusAction = async (article: Article, status: ArticleStatus) => {
    setProcessingId(article.id);
    try {
      if (status === 'published') await publishArticle(article.id);
      else if (status === 'archived') await archiveArticle(article.id);
      else await unpublishArticle(article.id);
      showMessage(status === 'published' ? 'Article published.' : status === 'archived' ? 'Article archived.' : 'Article moved to draft.');
      onRefreshArticles();
    } catch (err: any) {
      showError(err.message || 'Failed to update article');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReviewAction = async (article: Article, reviewStatus: ArticleReviewStatus) => {
    const needsFeedback = reviewStatus === 'changes_requested' || reviewStatus === 'rejected';
    const feedback = needsFeedback
      ? window.prompt(reviewStatus === 'changes_requested' ? 'What should the customer change?' : 'Why is this article rejected?')
      : undefined;
    if (needsFeedback && !feedback?.trim()) return;

    setProcessingId(article.id);
    try {
      await reviewArticleAdmin(article.id, reviewStatus, feedback?.trim());
      showMessage(
        reviewStatus === 'published'
          ? 'Article published.'
          : reviewStatus === 'approved'
            ? 'Article approved.'
            : 'Article review updated.'
      );
      onRefreshArticles();
    } catch (err: any) {
      showError(err.message || 'Failed to update review');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (article: Article) => {
    if (!window.confirm(`Delete "${article.title}" permanently?`)) return;
    setProcessingId(article.id);
    try {
      await deleteArticle(article.id);
      showMessage('Article deleted.');
      onRefreshArticles();
    } catch (err: any) {
      showError(err.message || 'Failed to delete article');
    } finally {
      setProcessingId(null);
    }
  };

  const seoChecklist = editingArticle ? [
    { label: 'Primary keyword added', done: Boolean(editingArticle.primaryKeyword?.trim()) },
    { label: 'SEO title added', done: Boolean(editingArticle.seoTitle?.trim()) },
    { label: 'Meta description added', done: Boolean(editingArticle.metaDescription?.trim()) },
    { label: 'URL slug created', done: Boolean(editingArticle.slug?.trim()) },
    { label: 'H1 present', done: Boolean(editingArticle.title?.trim()) },
    { label: 'Featured image has alt text', done: Boolean(editingArticle.featuredImage && editingArticle.featuredImageAlt?.trim()) },
    { label: 'Article has internal links', done: Boolean(editingArticle.content?.includes('](/') || editingArticle.content?.includes('](')) },
    { label: 'Article has sufficient content', done: (editingArticle.content || '').trim().split(/\s+/).filter(Boolean).length >= 600 }
  ] : [];

  return (
    <div className="space-y-6 text-[#17181F]">
      {message && (
        <div className="flex items-center justify-between rounded-2xl bg-[#1F8F5F] px-4 py-3 text-xs font-bold text-white">
          <span className="flex items-center gap-2"><Check className="h-4 w-4" /> {message}</span>
          <button type="button" onClick={() => setMessage('')}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between rounded-2xl bg-red-600 px-4 py-3 text-xs font-bold text-white">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[#17181F]">Articles & SEO Library</h2>
          <p className="text-xs text-[#6E6C63]">Write, optimize, preview, publish, and review customer-submitted articles.</p>
        </div>
        <button
          type="button"
          onClick={handleNewArticle}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5A36] px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[#E94D2C]"
        >
          <FilePenLine className="h-4 w-4" />
          Write Article
        </button>
      </div>

      <div className="grid gap-3 rounded-3xl border border-[#E7DFCE] bg-[#17181F] p-5 text-[#FAF6EE] shadow-2xs md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF5A36] text-white">
            <FilePenLine className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold">Write and publish an article</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#C9C3B6]">
              Add the main heading, SEO title, focus keyword, tags, cover image, article body, preview it, then publish from the editor.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNewArticle}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FAF6EE] px-5 py-3 text-xs font-bold text-[#17181F] hover:bg-white"
        >
          <Plus className="h-4 w-4 text-[#FF5A36]" />
          Start Writing
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#E7DFCE] bg-[#FFFFFF] p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            { key: 'ALL', label: `All (${articles.length})` },
            { key: 'CUSTOMER_REVIEW', label: `Review (${articles.filter(a => a.source === 'customer' && ['submitted', 'under_review', 'changes_requested', 'approved', 'rejected'].includes(a.reviewStatus || 'draft')).length})` },
            { key: 'SCHEDULED', label: `Scheduled (${articles.filter(a => a.scheduledAt).length})` },
            { key: 'published', label: `Published (${articles.filter(a => a.status === 'published').length})` },
            { key: 'draft', label: `Drafts (${articles.filter(a => a.status === 'draft').length})` },
            { key: 'archived', label: `Archived (${articles.filter(a => a.status === 'archived').length})` }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key as any)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                filterStatus === tab.key
                  ? 'bg-[#17181F] text-[#FAF6EE]'
                  : 'text-[#6E6C63] hover:bg-[#FAF6EE] hover:text-[#17181F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A6A296]" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full rounded-full border border-[#E7DFCE] bg-[#FAF6EE] py-1.5 pl-9 pr-3 text-xs outline-none focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#E7DFCE] bg-[#FAF6EE] font-mono text-[11px] font-bold uppercase tracking-wider text-[#6E6C63]">
                <th className="p-4">Title</th>
                <th className="p-4">Author</th>
                <th className="p-4">Category</th>
                <th className="p-4">Workflow</th>
                <th className="p-4">Published</th>
                <th className="p-4">Updated</th>
                <th className="p-4">Words</th>
                <th className="p-4">SEO</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DFCE]">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#6E6C63]">
                    <div className="flex flex-col items-center gap-3">
                      <span>No articles found.</span>
                      <button
                        type="button"
                        onClick={handleNewArticle}
                        className="inline-flex items-center gap-2 rounded-full bg-[#17181F] px-4 py-2 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F]"
                      >
                        <FilePenLine className="h-4 w-4 text-[#FF5A36]" />
                        Write Article
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredArticles.map(article => {
                const seoReady = Boolean(article.seoTitle && article.metaDescription && article.slug && article.featuredImageAlt);
                return (
                  <tr key={article.id} className="hover:bg-[#FAF6EE]/50">
                    <td className="p-4">
                      <div className="font-bold text-[#17181F]">{article.title}</div>
                      <div className="font-mono text-[11px] text-[#A6A296]">/articles/{article.slug}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#17181F]">{article.source === 'customer' ? article.ownerCustomerName || article.author : article.author}</div>
                      <div className="font-mono text-[10px] text-[#A6A296]">{article.source === 'customer' ? article.ownerCustomerEmail || 'customer' : 'admin'}</div>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-[#F3EDE0] px-2.5 py-0.5 text-[10px] font-bold">{article.category}</span>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          article.status === 'published'
                            ? 'bg-[#1F8F5F]/15 text-[#1F8F5F]'
                            : article.status === 'archived'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {article.status === 'published' ? <Eye className="h-3 w-3" /> : article.status === 'archived' ? <Archive className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {article.status}
                        </span>
                        <div className="font-mono text-[10px] font-bold text-[#6E6C63]">{reviewStatusLabel(article.reviewStatus)}</div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-[#6E6C63]">{formatDate(article.publishedAt)}</td>
                    <td className="p-4 font-mono text-[11px] text-[#6E6C63]">
                      {formatDate(article.updatedAt)}
                      {article.scheduledAt && <div className="mt-1 text-[10px] font-bold text-[#FF5A36]">Scheduled {formatDate(article.scheduledAt)}</div>}
                    </td>
                    <td className="p-4 font-mono font-bold text-[#17181F]">{(article.content || '').trim().split(/\s+/).filter(Boolean).length}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${seoReady ? 'bg-[#1F8F5F]/15 text-[#1F8F5F]' : 'bg-amber-100 text-amber-800'}`}>
                        {seoReady ? 'Ready' : 'Needs Review'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => setPreviewArticle(article)} title="Preview" className="rounded-full p-1.5 text-[#6E6C63] hover:bg-[#F3EDE0]"><Eye className="h-4 w-4" /></button>
                        {article.status === 'published' && (
                          <button type="button" onClick={() => onPreviewPublicArticle(article.slug)} title="Open public article" className="rounded-full p-1.5 text-[#6E6C63] hover:bg-[#F3EDE0]"><ExternalLink className="h-4 w-4" /></button>
                        )}
                        <button type="button" onClick={() => setEditingArticle({ ...article })} title="Edit" className="rounded-full p-1.5 text-[#6E6C63] hover:bg-[#F3EDE0]"><Edit className="h-4 w-4" /></button>
                        {article.source === 'customer' && article.reviewStatus === 'submitted' && (
                          <button type="button" disabled={processingId === article.id} onClick={() => handleReviewAction(article, 'under_review')} className="rounded-full px-2.5 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-50">Review</button>
                        )}
                        {article.source === 'customer' && ['submitted', 'under_review', 'changes_requested'].includes(article.reviewStatus || '') && (
                          <>
                            <button type="button" disabled={processingId === article.id} onClick={() => handleReviewAction(article, 'approved')} className="rounded-full px-2.5 py-1 text-[10px] font-bold text-[#1F8F5F] hover:bg-[#1F8F5F]/10">Approve</button>
                            <button type="button" disabled={processingId === article.id} onClick={() => handleReviewAction(article, 'changes_requested')} className="rounded-full px-2.5 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-50">Changes</button>
                            <button type="button" disabled={processingId === article.id} onClick={() => handleReviewAction(article, 'rejected')} className="rounded-full px-2.5 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50">Reject</button>
                          </>
                        )}
                        {article.status === 'published' ? (
                          <button type="button" disabled={processingId === article.id} onClick={() => handleStatusAction(article, 'draft')} className="rounded-full px-2.5 py-1 text-[10px] font-bold text-stone-600 hover:bg-[#F3EDE0]">Unpublish</button>
                        ) : (
                          <button type="button" disabled={processingId === article.id} onClick={() => handleStatusAction(article, 'published')} className="rounded-full px-2.5 py-1 text-[10px] font-bold text-[#1F8F5F] hover:bg-[#1F8F5F]/10">Publish</button>
                        )}
                        {article.status !== 'archived' && (
                          <button type="button" disabled={processingId === article.id} onClick={() => handleStatusAction(article, 'archived')} title="Archive" className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100"><Archive className="h-4 w-4" /></button>
                        )}
                        <button type="button" onClick={() => handleDelete(article)} title="Delete" className="rounded-full p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 p-5">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">{editingArticle.id ? 'Edit Article' : 'Write Article'}</h3>
                <p className="text-xs text-slate-500">{editingArticle.status || 'draft'} · {calculateReadingTime(editingArticle.content || editingArticle.excerpt || '')} min read</p>
              </div>
              <button type="button" onClick={() => setEditingArticle(null)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_340px]">
              <div className="space-y-5 p-5 text-xs">
                <section className="space-y-4">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">Heading, Title & Keywords</h4>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Main Heading / H1 *</label>
                    <input
                      value={editingArticle.title || ''}
                      onChange={e => updateEditingArticle({
                        title: e.target.value,
                        slug: createArticleSlug(e.target.value),
                        seoTitle: editingArticle.seoTitle || e.target.value
                      })}
                      placeholder="Write the article heading customers and Google will see"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between font-bold text-slate-700">
                      <label>SEO Browser Title</label>
                      <span className="font-mono text-[10px] text-slate-400">{(editingArticle.seoTitle || '').length}/60</span>
                    </div>
                    <input
                      value={editingArticle.seoTitle || ''}
                      onChange={e => updateEditingArticle({ seoTitle: e.target.value })}
                      placeholder="Short search result title"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Focus Keyword *</label>
                      <input
                        value={editingArticle.primaryKeyword || ''}
                        onChange={e => updateEditingArticle({ primaryKeyword: e.target.value })}
                        placeholder="e.g. client acquisition for freelancers"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Secondary Keywords</label>
                      <input
                        value={(editingArticle.secondaryKeywords || []).join(', ')}
                        onChange={e => updateEditingArticle({ secondaryKeywords: splitCommaList(e.target.value) })}
                        placeholder="keyword one, keyword two"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Summary / Excerpt</label>
                    <textarea rows={3} value={editingArticle.excerpt || ''} onChange={e => updateEditingArticle({ excerpt: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Author</label>
                      <input value={editingArticle.author || ''} onChange={e => updateEditingArticle({ author: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Category</label>
                      <select value={editingArticle.category || 'Digital Business'} onChange={e => updateEditingArticle({ category: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
                        {categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Tags</label>
                    <input value={(editingArticle.tags || []).join(', ')} onChange={e => updateEditingArticle({ tags: splitCommaList(e.target.value) })} placeholder="freelancing, marketing, templates" className="w-full rounded-xl border border-slate-300 px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="mb-2 block font-bold text-slate-700">Featured Image</label>
                    <div className="flex flex-wrap items-center gap-3">
                      {editingArticle.featuredImage ? <img src={editingArticle.featuredImage} alt="" className="h-16 w-24 rounded-xl border border-slate-200 object-cover" /> : <div className="flex h-16 w-24 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400"><Image className="h-5 w-5" /></div>}
                      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleUploadFeaturedImage} className="text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white" />
                      {uploading && <RefreshCw className="h-4 w-4 animate-spin text-slate-600" />}
                    </div>
                    <input value={editingArticle.featuredImage || ''} onChange={e => updateEditingArticle({ featuredImage: e.target.value })} placeholder="Image URL" className="mt-3 w-full rounded-xl border border-slate-300 px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                    <input value={editingArticle.featuredImageAlt || ''} onChange={e => updateEditingArticle({ featuredImageAlt: e.target.value })} placeholder="Featured image alt text" className="mt-3 w-full rounded-xl border border-slate-300 px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">Article Body</h4>
                  <textarea
                    rows={18}
                    value={editingArticle.content || ''}
                    onChange={e => updateEditingArticle({ content: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-mono text-[12px] leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Write the full article here. Markdown headings, lists, links, and tables are supported."
                  />
                </section>

                <section className="space-y-3 rounded-2xl border border-[#E7DFCE] bg-[#FAF6EE] p-4">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">Book CTA</h4>
                  <label className="flex items-center gap-2 font-bold text-slate-700">
                    <input type="checkbox" checked={Boolean(editingArticle.bookCta?.enabled)} onChange={e => updateEditingArticle({ bookCta: { ...(editingArticle.bookCta || firstArticleDraft.bookCta!), enabled: e.target.checked } })} />
                    Enable book promotion
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={editingArticle.bookCta?.title || ''} onChange={e => updateEditingArticle({ bookCta: { ...(editingArticle.bookCta || firstArticleDraft.bookCta!), title: e.target.value } })} placeholder="Book title" className="rounded-xl border border-slate-300 px-3.5 py-2" />
                    <input value={editingArticle.bookCta?.author || ''} onChange={e => updateEditingArticle({ bookCta: { ...(editingArticle.bookCta || firstArticleDraft.bookCta!), author: e.target.value } })} placeholder="Author" className="rounded-xl border border-slate-300 px-3.5 py-2" />
                    <input value={editingArticle.bookCta?.coverImage || ''} onChange={e => updateEditingArticle({ bookCta: { ...(editingArticle.bookCta || firstArticleDraft.bookCta!), coverImage: e.target.value } })} placeholder="Book cover URL" className="rounded-xl border border-slate-300 px-3.5 py-2" />
                    <input value={editingArticle.bookCta?.amazonUrl || ''} onChange={e => updateEditingArticle({ bookCta: { ...(editingArticle.bookCta || firstArticleDraft.bookCta!), amazonUrl: e.target.value } })} placeholder="Amazon URL" className="rounded-xl border border-slate-300 px-3.5 py-2" />
                    <input value={editingArticle.bookCta?.googlePlayUrl || ''} onChange={e => updateEditingArticle({ bookCta: { ...(editingArticle.bookCta || firstArticleDraft.bookCta!), googlePlayUrl: e.target.value } })} placeholder="Google Play Books URL" className="rounded-xl border border-slate-300 px-3.5 py-2 sm:col-span-2" />
                    <textarea rows={2} value={editingArticle.bookCta?.description || ''} onChange={e => updateEditingArticle({ bookCta: { ...(editingArticle.bookCta || firstArticleDraft.bookCta!), description: e.target.value } })} placeholder="Short description" className="rounded-xl border border-slate-300 px-3.5 py-2 sm:col-span-2" />
                  </div>
                </section>
              </div>

              <aside className="space-y-5 border-t border-slate-100 bg-slate-50 p-5 text-xs lg:border-l lg:border-t-0">
                <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">Publishing Workflow</h4>
                  {editingArticle.source === 'customer' && (
                    <div className="rounded-xl bg-[#FAF6EE] p-3 text-[11px] leading-5 text-[#6E6C63]">
                      <div className="font-bold text-[#17181F]">{editingArticle.ownerCustomerName || 'Customer submission'}</div>
                      <div className="font-mono">{editingArticle.ownerCustomerEmail}</div>
                      <div className="mt-1">Review: {reviewStatusLabel(editingArticle.reviewStatus)}</div>
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Schedule Publish Date</label>
                    <input
                      type="datetime-local"
                      value={formatDateTimeInput(editingArticle.scheduledAt)}
                      onChange={e => updateEditingArticle({ scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2"
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">SEO Panel</h4>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Primary Keyword</label>
                    <input value={editingArticle.primaryKeyword || ''} onChange={e => updateEditingArticle({ primaryKeyword: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3.5 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Secondary Keywords</label>
                    <input value={(editingArticle.secondaryKeywords || []).join(', ')} onChange={e => updateEditingArticle({ secondaryKeywords: splitCommaList(e.target.value) })} className="w-full rounded-xl border border-slate-300 px-3.5 py-2" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between font-bold text-slate-700"><label>SEO Title</label><span className="font-mono text-[10px] text-slate-400">{(editingArticle.seoTitle || '').length}/60</span></div>
                    <input value={editingArticle.seoTitle || ''} onChange={e => updateEditingArticle({ seoTitle: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3.5 py-2" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between font-bold text-slate-700"><label>Meta Description</label><span className="font-mono text-[10px] text-slate-400">{(editingArticle.metaDescription || '').length}/160</span></div>
                    <textarea rows={3} value={editingArticle.metaDescription || ''} onChange={e => updateEditingArticle({ metaDescription: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3.5 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">URL Slug</label>
                    <input value={editingArticle.slug || ''} onChange={e => updateEditingArticle({ slug: createArticleSlug(e.target.value) })} className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono" />
                  </div>
                  <input value={editingArticle.canonicalUrl || ''} onChange={e => updateEditingArticle({ canonicalUrl: e.target.value })} placeholder="Canonical URL" className="w-full rounded-xl border border-slate-300 px-3.5 py-2" />
                  <input value={editingArticle.socialShareTitle || ''} onChange={e => updateEditingArticle({ socialShareTitle: e.target.value })} placeholder="Social share title" className="w-full rounded-xl border border-slate-300 px-3.5 py-2" />
                  <textarea rows={2} value={editingArticle.socialShareDescription || ''} onChange={e => updateEditingArticle({ socialShareDescription: e.target.value })} placeholder="Social share description" className="w-full rounded-xl border border-slate-300 px-3.5 py-2" />
                  <input value={editingArticle.socialShareImage || ''} onChange={e => updateEditingArticle({ socialShareImage: e.target.value })} placeholder="Social share image" className="w-full rounded-xl border border-slate-300 px-3.5 py-2" />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="font-bold text-slate-900">SEO checklist</h4>
                  <div className="mt-3 space-y-2">
                    {seoChecklist.map(item => (
                      <div key={item.label} className="flex items-center gap-2 text-[11px] text-slate-600">
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full ${item.done ? 'bg-[#1F8F5F] text-white' : 'bg-slate-200 text-slate-400'}`}>
                          <Check className="h-3 w-3" />
                        </span>
                        {item.label}
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white p-4 text-xs">
              <button type="button" onClick={() => setPreviewArticle(editingArticle)} className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DFCE] px-4 py-2 font-bold text-[#17181F]">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setEditingArticle(null)} className="rounded-full border border-slate-200 px-4 py-2 font-bold text-slate-600">Cancel</button>
                <button type="button" disabled={saving || uploading} onClick={() => handleSave('draft')} className="rounded-full border border-[#E7DFCE] bg-[#FAF6EE] px-4 py-2 font-bold text-[#17181F] disabled:opacity-50">
                  Save Draft
                </button>
                <button type="button" disabled={saving || uploading} onClick={() => handleSave('published')} className="inline-flex items-center gap-1.5 rounded-full bg-[#17181F] px-5 py-2 font-bold text-[#FAF6EE] disabled:opacity-50">
                  {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5 text-[#FF5A36]" />}
                  Publish Article
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewArticle && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="mx-auto my-6 max-w-3xl rounded-3xl border border-[#E7DFCE] bg-[#FAF6EE] p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-[#E7DFCE] pb-4">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">Preview</p>
                <h3 className="font-display text-xl font-bold text-[#17181F]">{previewArticle.title}</h3>
              </div>
              <button type="button" onClick={() => setPreviewArticle(null)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7DFCE] bg-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <article>
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">{previewArticle.category}</p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight tracking-tight text-[#17181F]">{previewArticle.title}</h1>
              <p className="mt-4 text-base leading-relaxed text-[#6E6C63]">{previewArticle.excerpt}</p>
              {previewArticle.featuredImage && <img src={previewArticle.featuredImage} alt={previewArticle.featuredImageAlt || ''} className="mt-6 aspect-16/10 w-full rounded-3xl border border-[#E7DFCE] object-cover" />}
              <section className="article-prose mt-8" dangerouslySetInnerHTML={{ __html: renderArticleMarkdown(previewArticle.content || '') || '<p>No content yet.</p>' }} />
            </article>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleManagement;
