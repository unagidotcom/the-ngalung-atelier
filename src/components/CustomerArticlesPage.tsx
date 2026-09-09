import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  CreditCard,
  Eye,
  FilePenLine,
  RefreshCw,
  Send,
  Sparkles,
  X
} from 'lucide-react';
import { Article, ArticleSubmissionConfig, ArticleSubmissionEntitlement, CustomerUser } from '../types';
import {
  createArticleSubmissionOrder,
  fetchCustomerArticles,
  saveCustomerArticleDraft,
  submitCustomerArticle,
  verifyArticleSubmissionPayment
} from '../lib/api';
import { calculateReadingTime, createArticleSlug, renderArticleMarkdown } from '../lib/articleMarkdown';

interface CustomerArticlesPageProps {
  customerUser: CustomerUser;
  mode?: 'list' | 'write';
  onNavigateArticles: () => void;
}

const defaultConfig: ArticleSubmissionConfig = {
  enabled: true,
  priceINR: 999,
  currency: 'INR',
  guidelines: 'Submit original, useful, non-spam articles for editorial review. Publication is not guaranteed and customers cannot publish directly.'
};

const categories = [
  'Client Acquisition',
  'Freelancing',
  'Performance Marketing',
  'Artificial Intelligence',
  'Digital Business',
  'Business Growth'
];

function formatDate(value?: string) {
  if (!value) return 'Not yet';
  return new Date(value).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusCopy(article: Article) {
  const status = article.reviewStatus || 'draft';
  const labels: Record<string, string> = {
    draft: 'Draft',
    ready_to_submit: 'Ready to submit',
    submitted: 'Submitted',
    under_review: 'Under review',
    changes_requested: 'Changes requested',
    approved: 'Approved',
    published: 'Published',
    rejected: 'Rejected',
    archived: 'Archived'
  };
  return labels[status] || status;
}

function splitCommaList(value?: string | string[]) {
  if (Array.isArray(value)) return value;
  return (value || '').split(',').map(item => item.trim()).filter(Boolean);
}

export const CustomerArticlesPage: React.FC<CustomerArticlesPageProps> = ({
  customerUser,
  mode = 'list',
  onNavigateArticles
}) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [entitlements, setEntitlements] = useState<ArticleSubmissionEntitlement[]>([]);
  const [config, setConfig] = useState<ArticleSubmissionConfig>(defaultConfig);
  const [editing, setEditing] = useState<Partial<Article> | null>(null);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const unusedCredits = useMemo(
    () => entitlements.filter(item => item.status === 'active' && !item.articleId),
    [entitlements]
  );

  const loadArticles = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCustomerArticles();
      setArticles(data.articles);
      setEntitlements(data.entitlements);
      setConfig(data.config || defaultConfig);
    } catch (err: any) {
      setError(err.message || 'Unable to load your articles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = `${mode === 'write' ? 'Write an Article' : 'My Articles'} | The Ngalung Atelier`;
    loadArticles();
  }, []);

  useEffect(() => {
    if (mode === 'write' && !editing && !loading && unusedCredits.length > 0) {
      setEditing({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        author: customerUser.name,
        category: 'Digital Business',
        tags: [],
        featuredImage: '',
        featuredImageAlt: '',
        primaryKeyword: '',
        secondaryKeywords: [],
        seoTitle: '',
        metaDescription: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        status: 'draft'
      });
    }
  }, [mode, editing, loading, unusedCredits.length, customerUser.name]);

  const showMessage = (value: string) => {
    setMessage(value);
    setError('');
    setTimeout(() => setMessage(''), 4500);
  };

  const showError = (value: string) => {
    setError(value);
    setTimeout(() => setError(''), 5500);
  };

  const startNewDraft = () => {
    if (unusedCredits.length === 0) {
      showError('Buy one article submission credit before creating a new draft.');
      return;
    }
    setEditing({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      author: customerUser.name,
      category: 'Digital Business',
      tags: [],
      featuredImage: '',
      featuredImageAlt: '',
      primaryKeyword: '',
      secondaryKeywords: [],
      seoTitle: '',
      metaDescription: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      status: 'draft'
    });
    setPreview(false);
  };

  const handleBuyCredit = async () => {
    setPaying(true);
    setError('');
    try {
      const order = await createArticleSubmissionOrder();
      if (!order.razorpay || typeof (window as any).Razorpay === 'undefined') {
        throw new Error('Online payment is temporarily unavailable.');
      }

      const options = {
        key: order.razorpay.keyId,
        amount: order.razorpay.amount,
        currency: order.razorpay.currency,
        name: 'The Ngalung Atelier',
        description: 'Article submission credit',
        order_id: order.razorpay.orderId,
        prefill: {
          name: customerUser.name,
          email: customerUser.email
        },
        theme: { color: '#FF5A36' },
        handler: async (response: any) => {
          try {
            await verifyArticleSubmissionPayment({
              razorpayOrderId: response.razorpay_order_id || order.razorpay.orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            await loadArticles();
            showMessage('Article submission credit added.');
          } catch (err: any) {
            showError(err.message || 'Payment verification failed.');
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false)
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setPaying(false);
      showError(err.message || 'Unable to start payment.');
    }
  };

  const handleSave = async () => {
    if (!editing?.title?.trim()) {
      showError('Article title is required.');
      return;
    }
    setSaving(true);
    try {
      const next: Partial<Article> = {
        ...editing,
        slug: createArticleSlug(editing.slug || editing.title || ''),
        tags: splitCommaList(editing.tags),
        secondaryKeywords: splitCommaList(editing.secondaryKeywords),
        seoTitle: editing.seoTitle || editing.title,
        metaDescription: editing.metaDescription || editing.excerpt || '',
        ogTitle: editing.ogTitle || editing.seoTitle || editing.title,
        ogDescription: editing.ogDescription || editing.metaDescription || editing.excerpt || '',
        ogImage: editing.ogImage || editing.featuredImage || '',
        socialShareTitle: editing.socialShareTitle || editing.ogTitle || editing.seoTitle || editing.title,
        socialShareDescription: editing.socialShareDescription || editing.ogDescription || editing.metaDescription || editing.excerpt || '',
        socialShareImage: editing.socialShareImage || editing.ogImage || editing.featuredImage || ''
      };
      const saved = await saveCustomerArticleDraft(next);
      setEditing(saved);
      await loadArticles();
      showMessage('Article draft saved.');
    } catch (err: any) {
      showError(err.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!editing?.id) {
      await handleSave();
      showError('Save the draft once, then submit it for review.');
      return;
    }
    if (!editing.title?.trim() || !editing.content?.trim() || !editing.primaryKeyword?.trim()) {
      showError('Title, article content, and focus keyword are required before submission.');
      return;
    }
    setSaving(true);
    try {
      const result = await submitCustomerArticle(editing.id);
      setEditing(result.article);
      await loadArticles();
      showMessage('Article submitted for admin review.');
    } catch (err: any) {
      showError(err.message || 'Failed to submit article.');
    } finally {
      setSaving(false);
    }
  };

  const wordCount = (editing?.content || '').trim().split(/\s+/).filter(Boolean).length;
  const seoChecks = editing ? [
    { label: 'Focus keyword', done: Boolean(editing.primaryKeyword?.trim()) },
    { label: 'SEO title', done: Boolean(editing.seoTitle?.trim() || editing.title?.trim()) },
    { label: 'Meta description', done: Boolean(editing.metaDescription?.trim() || editing.excerpt?.trim()) },
    { label: 'URL slug', done: Boolean(editing.slug?.trim() || editing.title?.trim()) },
    { label: '600+ words', done: wordCount >= 600 },
    { label: 'Image alt text', done: !editing.featuredImage || Boolean(editing.featuredImageAlt?.trim()) }
  ] : [];

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#FAF6EE]">
        <RefreshCw className="h-6 w-6 animate-spin text-[#FF5A36]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] pb-20 text-[#17181F]">
      <section className="border-b border-[#E7DFCE] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E7DFCE] bg-[#FAF6EE] px-3.5 py-1 text-[11px] font-bold uppercase text-[#FF5A36]">
              <FilePenLine className="h-3.5 w-3.5" />
              Customer Article Desk
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">Write for The Ngalung Atelier</h1>
            <p className="mt-3 text-sm leading-6 text-[#6E6C63]">
              Create drafts, buy submission credits, and send finished articles to the editorial queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onNavigateArticles}
              className="inline-flex items-center gap-2 rounded-full border border-[#D8CDB4] bg-white px-4 py-2 text-xs font-bold text-[#404252] hover:bg-[#FAF6EE]"
            >
              <BookOpen className="h-4 w-4" />
              Public Articles
            </button>
            <button
              type="button"
              onClick={startNewDraft}
              className="inline-flex items-center gap-2 rounded-full bg-[#17181F] px-4 py-2 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F]"
            >
              <FilePenLine className="h-4 w-4 text-[#FF5A36]" />
              New Draft
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-8 sm:px-6 lg:grid-cols-[340px_1fr] lg:px-8">
        <aside className="space-y-4">
          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{message}</div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>
          )}

          <div className="rounded-2xl border border-[#E7DFCE] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Submission Credit</h2>
              <span className="rounded-full bg-[#F3EDE0] px-2.5 py-1 text-[11px] font-bold text-[#6E6C63]">
                {unusedCredits.length} available
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#6E6C63]">{config.guidelines}</p>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#17181F] p-4 text-[#FAF6EE]">
              <div>
                <p className="text-[11px] font-bold uppercase text-[#AEB5C2]">Single submission</p>
                <p className="mt-1 font-display text-2xl font-bold">₹{Number(config.priceINR || 999).toLocaleString('en-IN')}</p>
              </div>
              <CreditCard className="h-7 w-7 text-[#FF5A36]" />
            </div>
            <button
              type="button"
              onClick={handleBuyCredit}
              disabled={!config.enabled || paying}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A36] px-4 py-3 text-xs font-bold text-white hover:bg-[#E94D2C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {config.enabled ? 'Buy Submission Credit' : 'Submissions Closed'}
            </button>
          </div>

          <div className="rounded-2xl border border-[#E7DFCE] bg-white p-5 shadow-2xs">
            <h2 className="text-sm font-bold">My Articles</h2>
            <div className="mt-4 space-y-2">
              {articles.length === 0 ? (
                <p className="text-xs leading-5 text-[#6E6C63]">No article drafts yet.</p>
              ) : articles.map(article => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => {
                    setEditing(article);
                    setPreview(false);
                  }}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    editing?.id === article.id
                      ? 'border-[#17181F] bg-[#F3EDE0]'
                      : 'border-[#E7DFCE] bg-white hover:bg-[#FAF6EE]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-xs font-bold text-[#17181F]">{article.title || 'Untitled draft'}</p>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#6E6C63]">
                      {statusCopy(article)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#7A7D89]">Updated {formatDate(article.updatedAt)}</p>
                  {article.reviewFeedback && (
                    <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#B43A1F]">{article.reviewFeedback}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          {!editing ? (
            <div className="rounded-2xl border border-[#E7DFCE] bg-white p-8 text-center shadow-2xs">
              <Sparkles className="mx-auto h-8 w-8 text-[#FF5A36]" />
              <h2 className="mt-4 font-display text-2xl font-bold">Start with a submission credit</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6E6C63]">
                Each paid credit unlocks one article draft. The credit is consumed only when the article is sent for admin review.
              </p>
              <button
                type="button"
                onClick={unusedCredits.length > 0 ? startNewDraft : handleBuyCredit}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#17181F] px-5 py-3 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F]"
              >
                {unusedCredits.length > 0 ? 'Create Draft' : 'Buy Credit'}
                <ArrowRight className="h-4 w-4 text-[#FF5A36]" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-[#E7DFCE] bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-[#FF5A36]">{statusCopy(editing as Article)}</p>
                  <h2 className="font-display text-2xl font-bold">Article Editor</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPreview(value => !value)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#D8CDB4] bg-white px-3 py-2 text-xs font-bold text-[#404252] hover:bg-[#FAF6EE]"
                  >
                    <Eye className="h-4 w-4" />
                    {preview ? 'Edit' : 'Preview'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#D8CDB4] bg-white px-3 py-2 text-xs font-bold text-[#17181F] hover:bg-[#FAF6EE] disabled:opacity-60"
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#1F8F5F]" />}
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#FF5A36] px-3 py-2 text-xs font-bold text-white hover:bg-[#E94D2C] disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    Submit
                  </button>
                </div>
              </div>

              {editing.reviewFeedback && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                  <strong>Admin feedback:</strong> {editing.reviewFeedback}
                </div>
              )}

              {preview ? (
                <article className="rounded-2xl border border-[#E7DFCE] bg-white p-6 shadow-2xs">
                  <p className="text-xs font-bold uppercase text-[#FF5A36]">{editing.category}</p>
                  <h1 className="mt-2 font-display text-3xl font-bold">{editing.title || 'Untitled article'}</h1>
                  <p className="mt-3 text-sm leading-6 text-[#6E6C63]">{editing.excerpt}</p>
                  <div
                    className="article-content mt-6"
                    dangerouslySetInnerHTML={{ __html: renderArticleMarkdown(editing.content || '') }}
                  />
                </article>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                  <div className="space-y-4 rounded-2xl border border-[#E7DFCE] bg-white p-5 shadow-2xs">
                    <input
                      value={editing.title || ''}
                      onChange={e => setEditing({ ...editing, title: e.target.value, slug: createArticleSlug(e.target.value) })}
                      placeholder="Article title"
                      className="w-full rounded-2xl border border-[#D8CDB4] bg-[#FAF6EE] px-4 py-3 text-sm font-bold outline-none focus:border-[#FF5A36] focus:bg-white"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={editing.slug || ''}
                        onChange={e => setEditing({ ...editing, slug: createArticleSlug(e.target.value) })}
                        placeholder="url-slug"
                        className="rounded-2xl border border-[#D8CDB4] bg-[#FAF6EE] px-4 py-3 text-xs outline-none focus:border-[#FF5A36] focus:bg-white"
                      />
                      <select
                        value={editing.category || 'Digital Business'}
                        onChange={e => setEditing({ ...editing, category: e.target.value })}
                        className="rounded-2xl border border-[#D8CDB4] bg-[#FAF6EE] px-4 py-3 text-xs font-bold outline-none focus:border-[#FF5A36] focus:bg-white"
                      >
                        {categories.map(category => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </div>
                    <textarea
                      rows={3}
                      value={editing.excerpt || ''}
                      onChange={e => setEditing({ ...editing, excerpt: e.target.value })}
                      placeholder="Short excerpt"
                      className="w-full rounded-2xl border border-[#D8CDB4] bg-[#FAF6EE] px-4 py-3 text-xs leading-5 outline-none focus:border-[#FF5A36] focus:bg-white"
                    />
                    <textarea
                      rows={18}
                      value={editing.content || ''}
                      onChange={e => setEditing({ ...editing, content: e.target.value })}
                      placeholder="Write the full article in Markdown..."
                      className="w-full rounded-2xl border border-[#D8CDB4] bg-[#FAF6EE] px-4 py-3 font-mono text-xs leading-6 outline-none focus:border-[#FF5A36] focus:bg-white"
                    />
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-2xl border border-[#E7DFCE] bg-white p-4 shadow-2xs">
                      <h3 className="text-sm font-bold">SEO</h3>
                      <div className="mt-3 space-y-2">
                        {seoChecks.map(check => (
                          <div key={check.label} className="flex items-center gap-2 text-xs font-semibold text-[#5F6170]">
                            {check.done ? <Check className="h-3.5 w-3.5 text-[#1F8F5F]" /> : <X className="h-3.5 w-3.5 text-[#B43A1F]" />}
                            <span>{check.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#FAF6EE] px-3 py-2 text-[11px] font-bold text-[#6E6C63]">
                        <Clock className="h-3.5 w-3.5" />
                        {wordCount} words, {calculateReadingTime(editing.content || '')} min read
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-[#E7DFCE] bg-white p-4 shadow-2xs">
                      <input
                        value={editing.primaryKeyword || ''}
                        onChange={e => setEditing({ ...editing, primaryKeyword: e.target.value })}
                        placeholder="Focus keyword"
                        className="w-full rounded-xl border border-[#D8CDB4] bg-[#FAF6EE] px-3 py-2 text-xs outline-none focus:border-[#FF5A36] focus:bg-white"
                      />
                      <input
                        value={Array.isArray(editing.tags) ? editing.tags.join(', ') : editing.tags || ''}
                        onChange={e => setEditing({ ...editing, tags: splitCommaList(e.target.value) })}
                        placeholder="Tags, comma separated"
                        className="w-full rounded-xl border border-[#D8CDB4] bg-[#FAF6EE] px-3 py-2 text-xs outline-none focus:border-[#FF5A36] focus:bg-white"
                      />
                      <input
                        value={editing.seoTitle || ''}
                        onChange={e => setEditing({ ...editing, seoTitle: e.target.value })}
                        placeholder="SEO title"
                        className="w-full rounded-xl border border-[#D8CDB4] bg-[#FAF6EE] px-3 py-2 text-xs outline-none focus:border-[#FF5A36] focus:bg-white"
                      />
                      <textarea
                        rows={4}
                        value={editing.metaDescription || ''}
                        onChange={e => setEditing({ ...editing, metaDescription: e.target.value })}
                        placeholder="Meta description"
                        className="w-full rounded-xl border border-[#D8CDB4] bg-[#FAF6EE] px-3 py-2 text-xs outline-none focus:border-[#FF5A36] focus:bg-white"
                      />
                      <input
                        value={editing.featuredImage || ''}
                        onChange={e => setEditing({ ...editing, featuredImage: e.target.value, ogImage: e.target.value })}
                        placeholder="Cover image URL"
                        className="w-full rounded-xl border border-[#D8CDB4] bg-[#FAF6EE] px-3 py-2 text-xs outline-none focus:border-[#FF5A36] focus:bg-white"
                      />
                      <input
                        value={editing.featuredImageAlt || ''}
                        onChange={e => setEditing({ ...editing, featuredImageAlt: e.target.value })}
                        placeholder="Cover image alt text"
                        className="w-full rounded-xl border border-[#D8CDB4] bg-[#FAF6EE] px-3 py-2 text-xs outline-none focus:border-[#FF5A36] focus:bg-white"
                      />
                    </div>

                    {(editing.reviewStatus === 'submitted' || editing.reviewStatus === 'under_review' || editing.reviewStatus === 'approved') && (
                      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>This article is locked while the admin review is in progress.</span>
                      </div>
                    )}
                  </aside>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CustomerArticlesPage;
