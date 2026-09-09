import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Clock, FilePenLine, Search, UserRound } from 'lucide-react';
import { Article } from '../types';
import { fetchArticles } from '../lib/api';
import { calculateReadingTime } from '../lib/articleMarkdown';

interface ArticleLibraryPageProps {
  onSelectArticle: (slug: string) => void;
  onWriteArticle: () => void;
}

const categories = [
  'All',
  'Client Acquisition',
  'Freelancing',
  'Performance Marketing',
  'Artificial Intelligence',
  'Digital Business',
  'Business Growth'
];

function formatDate(value?: string) {
  if (!value) return 'Unpublished';
  return new Date(value).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const ArticleLibraryPage: React.FC<ArticleLibraryPageProps> = ({ onSelectArticle, onWriteArticle }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Articles & Guides | The Ngalung Atelier';
    const description = 'Practical guides on freelancing, client acquisition, marketing, AI, digital business, and building better systems.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchArticles()
      .then(setArticles)
      .catch(err => setError(err.message || 'Unable to load articles.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter(article => {
      const categoryMatch = selectedCategory === 'All' || article.category === selectedCategory;
      const searchMatch = !q ||
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.category.toLowerCase().includes(q) ||
        (article.tags || []).some(tag => tag.toLowerCase().includes(q));
      return categoryMatch && searchMatch;
    });
  }, [articles, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#FAF6EE] pb-24 text-[#17181F]">
      <section className="border-b border-[#E7DFCE] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E7DFCE] bg-[#FAF6EE] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FF5A36] font-mono">
              <BookOpen className="h-3.5 w-3.5" />
              Articles & Guides
            </span>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-[#17181F] sm:text-5xl">
              Practical guides for building cleaner digital business systems.
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#6E6C63] sm:text-base">
              Practical guides on freelancing, client acquisition, marketing, AI, digital business, and building better systems.
            </p>
            <button
              type="button"
              onClick={onWriteArticle}
              className="inline-flex items-center gap-2 rounded-full bg-[#FF5A36] px-5 py-3 text-xs font-bold text-white shadow-2xs transition hover:bg-[#E94D2C]"
            >
              <FilePenLine className="h-4 w-4" />
              Write Article
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-[#E7DFCE] pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  selectedCategory === category
                    ? 'bg-[#17181F] text-[#FAF6EE]'
                    : 'border border-[#E7DFCE] bg-[#FFFFFF] text-[#6E6C63] hover:bg-[#F3EDE0] hover:text-[#17181F]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A6A296]" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full rounded-full border border-[#E7DFCE] bg-[#FFFFFF] py-2 pl-9 pr-4 text-xs text-[#17181F] shadow-2xs outline-none focus:border-[#17181F]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[36vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E7DFCE] border-t-[#FF5A36]" />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#D8CDB4] bg-[#FFFFFF] p-10 text-center">
            <h2 className="font-display text-xl font-bold text-[#17181F]">No published articles yet</h2>
            <p className="mt-2 text-sm text-[#6E6C63]">Published articles will appear here automatically.</p>
            <button
              type="button"
              onClick={onWriteArticle}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#17181F] px-5 py-3 text-xs font-bold text-[#FAF6EE] transition hover:bg-[#31333F]"
            >
              <FilePenLine className="h-4 w-4 text-[#FF5A36]" />
              Write Article
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-6 pt-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map(article => (
              <article
                key={article.id}
                className="group flex overflow-hidden rounded-3xl border border-[#E7DFCE] bg-[#FFFFFF] shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => onSelectArticle(article.slug)}
                  className="flex w-full flex-col text-left"
                >
                  <div className="aspect-16/10 overflow-hidden bg-[#F3EDE0]">
                    {article.featuredImage ? (
                      <img
                        src={article.featuredImage}
                        alt={article.featuredImageAlt || article.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#A6A296]">
                        <BookOpen className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5A36]">
                      {article.category}
                    </span>
                    <h2 className="mt-2 font-display text-xl font-bold leading-snug tracking-tight text-[#17181F] group-hover:text-[#FF5A36]">
                      {article.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#6E6C63]">
                      {article.excerpt}
                    </p>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#E7DFCE] pt-4 text-[11px] text-[#6E6C63]">
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5" />
                        {article.author}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {calculateReadingTime(article.content || article.excerpt)} min
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#A6A296]">
                      <span>{formatDate(article.publishedAt)}</span>
                      <span className="inline-flex items-center gap-1 font-bold text-[#17181F]">
                        Read Article
                        <ArrowRight className="h-3.5 w-3.5 text-[#FF5A36]" />
                      </span>
                    </div>
                  </div>
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default ArticleLibraryPage;
