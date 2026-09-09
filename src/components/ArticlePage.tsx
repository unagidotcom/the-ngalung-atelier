import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clock, ExternalLink, UserRound } from 'lucide-react';
import { Article } from '../types';
import { fetchArticleBySlug } from '../lib/api';
import { calculateReadingTime, renderArticleMarkdown } from '../lib/articleMarkdown';
import { analytics } from '../lib/analytics';

interface ArticlePageProps {
  slug: string;
  onNavigateHome: () => void;
  onNavigateArticles: () => void;
  onSelectArticle: (slug: string) => void;
}

function formatDate(value?: string) {
  if (!value) return 'Not published';
  return new Date(value).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    el = selector.startsWith('link') ? document.createElement('link') : document.createElement('meta');
    for (const [key, value] of Object.entries(attrs)) {
      if (key !== 'content' && key !== 'href') el.setAttribute(key, value);
    }
    document.head.appendChild(el);
  }
  if (attrs.content) el.setAttribute('content', attrs.content);
  if (attrs.href) el.setAttribute('href', attrs.href);
}

export const ArticlePage: React.FC<ArticlePageProps> = ({
  slug,
  onNavigateHome,
  onNavigateArticles,
  onSelectArticle
}) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchArticleBySlug(slug)
      .then(result => {
        setArticle(result.article);
        setRelatedArticles(result.relatedArticles || []);
        analytics.trackArticleView(result.article.id, result.article.slug);
      })
      .catch(err => setError(err.message || 'Article not found.'))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!article) return;
    const canonical = article.canonicalUrl || `${window.location.origin}/articles/${article.slug}`;
    const description = article.metaDescription || article.excerpt;
    const image = article.ogImage || article.socialShareImage || article.featuredImage;
    document.title = article.seoTitle || article.title;
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('link[rel="canonical"]', { rel: 'canonical', href: canonical });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: article.ogTitle || article.seoTitle || article.title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: article.ogDescription || description });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    if (image) upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image.startsWith('http') ? image : `${window.location.origin}${image}` });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: article.socialShareTitle || article.ogTitle || article.title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: article.socialShareDescription || article.ogDescription || description });
  }, [article]);

  const articleHtml = useMemo(() => article ? renderArticleMarkdown(article.content || '') : '', [article]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#FAF6EE]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E7DFCE] border-t-[#FF5A36]" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-[#A6A296]" />
        <h1 className="mt-4 font-display text-2xl font-bold text-[#17181F]">Article not found</h1>
        <p className="mt-2 text-sm text-[#6E6C63]">{error || 'This article is not available.'}</p>
        <button
          type="button"
          onClick={onNavigateArticles}
          className="mt-6 rounded-full bg-[#17181F] px-5 py-2.5 text-xs font-bold text-[#FAF6EE]"
        >
          Return to Articles
        </button>
      </div>
    );
  }

  const bookCta = article.bookCta?.enabled ? article.bookCta : null;

  return (
    <div className="bg-[#FAF6EE] pb-24 text-[#17181F]">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6E6C63]" aria-label="Breadcrumb">
          <button type="button" onClick={onNavigateHome} className="hover:text-[#FF5A36]">Home</button>
          <span>/</span>
          <button type="button" onClick={onNavigateArticles} className="hover:text-[#FF5A36]">Articles</button>
          <span>/</span>
          <span className="text-[#17181F]">{article.category}</span>
        </nav>

        <article className="mx-auto max-w-3xl">
          <header>
            <button
              type="button"
              onClick={onNavigateArticles}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-bold text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Articles
            </button>
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">{article.category}</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight text-[#17181F] sm:text-5xl">
              {article.title}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-[#6E6C63] sm:text-lg">
              {article.excerpt}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-[#E7DFCE] py-4 text-xs text-[#6E6C63]">
              <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> {article.author}</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(article.publishedAt)}</span>
              <span>Updated {formatDate(article.updatedAt)}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {calculateReadingTime(article.content || article.excerpt)} min read</span>
            </div>
            {article.featuredImage && (
              <img
                src={article.featuredImage}
                alt={article.featuredImageAlt || article.title}
                className="mt-8 aspect-16/10 w-full rounded-3xl border border-[#E7DFCE] bg-[#F3EDE0] object-cover"
              />
            )}
          </header>

          <section className="article-prose mt-10" dangerouslySetInnerHTML={{ __html: articleHtml || '<p>This article is being prepared.</p>' }} />

          {bookCta && (
            <aside className="mt-12 rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-5 shadow-xs sm:p-6">
              <div className="grid gap-5 sm:grid-cols-[120px_1fr] sm:items-center">
                <div className="aspect-3/4 overflow-hidden rounded-2xl border border-[#E7DFCE] bg-[#F3EDE0]">
                  {bookCta.coverImage ? (
                    <img src={bookCta.coverImage} alt={bookCta.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#A6A296]">
                      <BookOpen className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">Want to Go Deeper?</p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-[#17181F]">{bookCta.title}</h2>
                  <p className="mt-1 text-xs font-bold text-[#6E6C63]">By {bookCta.author}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#6E6C63]">{bookCta.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {bookCta.amazonUrl && (
                      <a
                        href={bookCta.amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        onClick={() => analytics.trackBookCtaClick(article.id, article.slug, 'amazon')}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#17181F] px-4 py-2 text-xs font-bold text-[#FAF6EE]"
                      >
                        Buy on Amazon
                        <ExternalLink className="h-3.5 w-3.5 text-[#FF5A36]" />
                      </a>
                    )}
                    {bookCta.googlePlayUrl && (
                      <a
                        href={bookCta.googlePlayUrl}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        onClick={() => analytics.trackBookCtaClick(article.id, article.slug, 'google_play')}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DFCE] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#17181F]"
                      >
                        Read on Google Play Books
                        <ExternalLink className="h-3.5 w-3.5 text-[#FF5A36]" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          )}

          <aside className="mt-12 rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-6">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">About the Author</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-[#17181F]">Ng Kharinghor</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6E6C63]">
              Builder behind The Ngalung Atelier, focused on practical digital systems for freelancers, creators, and online businesses.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={onNavigateHome} className="rounded-full border border-[#E7DFCE] px-4 py-2 text-xs font-bold text-[#17181F]">About page</button>
              <button type="button" onClick={onNavigateArticles} className="rounded-full bg-[#17181F] px-4 py-2 text-xs font-bold text-[#FAF6EE]">Other articles</button>
            </div>
          </aside>
        </article>

        {relatedArticles.length > 0 && (
          <section className="mt-16 border-t border-[#E7DFCE] pt-10">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">Related Articles</p>
                <h2 className="font-display text-2xl font-bold text-[#17181F]">Keep reading</h2>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {relatedArticles.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectArticle(item.slug)}
                  className="rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] p-5 text-left shadow-xs hover:bg-[#F3EDE0]/40"
                >
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FF5A36]">{item.category}</p>
                  <h3 className="mt-2 font-display text-lg font-bold leading-snug text-[#17181F]">{item.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6E6C63]">{item.excerpt}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#17181F]">
                    Read Article
                    <ArrowRight className="h-3.5 w-3.5 text-[#FF5A36]" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default ArticlePage;
