import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { store } from './server/dataStore';
import { authService, requireAdmin } from './server/auth';
import {
  hashCustomerPassword,
  verifyCustomerPassword,
  createCustomerSession,
  revokeCustomerSession,
  requireCustomerAuth,
  optionalCustomerAuth,
  AuthenticatedCustomerRequest
} from './server/customerAuth';
import { razorpayService } from './server/razorpay';
import { emailService } from './server/email';
import { FileStorageService } from './server/fileStorage';
import { getActiveStore, getDatabaseStatus, checkDatabaseConnection, isPostgresConfigured, runMigrations } from './server/db';
import { storageService } from './server/storage';
import { Product, StoreSettings, PublicStoreInfo, Order, OrderStatus, Article } from './src/types';
import { calculateReadingTime, renderArticleMarkdown } from './src/lib/articleMarkdown';

// Configure multer in-memory storage for safe inspection and storage delegation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 105 * 1024 * 1024 // 105 MB max payload
  }
});

interface CreateAppOptions {
  serveStatic?: boolean;
  runStartupChecks?: boolean;
}

function escapeHtml(value: string = ''): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBaseUrl(req: express.Request): string {
  const configured = process.env.PUBLIC_APP_URL || process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

function xmlEscape(value: string = ''): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildArticleMeta(article: Article, baseUrl: string) {
  const canonicalUrl = article.canonicalUrl || `${baseUrl}/articles/${article.slug}`;
  const image = article.ogImage || article.socialShareImage || article.featuredImage;
  return {
    title: article.seoTitle || article.title,
    description: article.metaDescription || article.excerpt,
    canonicalUrl,
    image: image ? (image.startsWith('http') ? image : `${baseUrl}${image}`) : '',
    ogTitle: article.ogTitle || article.socialShareTitle || article.seoTitle || article.title,
    ogDescription: article.ogDescription || article.socialShareDescription || article.metaDescription || article.excerpt
  };
}

function articleShell(title: string, body: string, head = ''): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${head}
  <title>${escapeHtml(title)}</title>
  <style>
    body{margin:0;background:#FAF6EE;color:#17181F;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
    a{color:inherit}
    .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
    .top{border-bottom:1px solid #E7DFCE;background:rgba(250,246,238,.96);position:sticky;top:0;z-index:5}
    .top-inner{height:64px;display:flex;align-items:center;justify-content:space-between}
    .brand{font-family:Georgia,serif;font-weight:800;text-decoration:none}
    .nav{display:flex;gap:18px;font-size:12px;font-weight:700;color:#6E6C63}
    .nav a{text-decoration:none}.nav a:hover{color:#FF5A36}
    .hero{padding:68px 0 36px;border-bottom:1px solid #E7DFCE}
    .eyebrow{font:700 11px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#FF5A36}
    h1{font-family:Georgia,serif;font-size:clamp(34px,6vw,64px);line-height:1.03;margin:12px 0 14px;letter-spacing:0}
    .lead{max-width:720px;color:#6E6C63;font-size:16px;line-height:1.8}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px;padding:40px 0 74px}
    .card{border:1px solid #E7DFCE;background:#fff;border-radius:24px;overflow:hidden;text-decoration:none;display:flex;flex-direction:column}
    .card img{width:100%;aspect-ratio:16/10;object-fit:cover;background:#F3EDE0}
    .card-body{padding:22px}.meta{font:700 11px ui-monospace,monospace;text-transform:uppercase;color:#FF5A36}
    h2{font-family:Georgia,serif;font-size:22px;line-height:1.2;margin:10px 0;color:#17181F}
    .excerpt{font-size:13px;line-height:1.7;color:#6E6C63}
    .byline{display:flex;justify-content:space-between;gap:12px;margin-top:18px;font-size:11px;color:#A6A296}
    .article{max-width:760px;margin:0 auto;padding:38px 24px 80px}
    .article h1{font-size:clamp(36px,7vw,66px)}
    .article-cover{width:100%;border-radius:24px;border:1px solid #E7DFCE;margin:28px 0;object-fit:cover;max-height:460px}
    .article-body{font-size:17px;line-height:1.86;color:#343434}.article-body h2{font-size:30px;margin-top:42px}.article-body h3{font-size:22px;margin-top:28px}
    .article-body p{margin:18px 0}.article-body blockquote{border-left:3px solid #FF5A36;padding-left:18px;color:#555}
    .article-body img{max-width:100%;border-radius:18px;border:1px solid #E7DFCE}.article-body a{color:#D94A27;font-weight:700}
    .article-body table{border-collapse:collapse;width:100%;font-size:14px}.article-table-wrap{overflow:auto}.article-body th,.article-body td{border:1px solid #E7DFCE;padding:10px;text-align:left}
    .article-inline-cta{border:1px solid #E7DFCE;background:#fff;padding:18px;border-radius:18px;font-weight:700}
    .empty{border:1px dashed #D8CDB4;background:#fff;border-radius:24px;padding:34px;text-align:center;color:#6E6C63;margin:36px 0 70px}
    footer{border-top:1px solid #E7DFCE;padding:28px 0;color:#6E6C63;font-size:12px}
    @media(max-width:720px){.nav{gap:10px;font-size:11px}.top-inner{height:auto;min-height:64px;align-items:flex-start;flex-direction:column;padding:14px 0}.hero{padding-top:42px}.wrap{padding:0 18px}.article{padding-left:18px;padding-right:18px}.article-body{font-size:16px}}
  </style>
</head>
<body>${body}</body>
</html>`;
}

function renderArticleCard(article: Article): string {
  const date = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Draft';
  const readingTime = calculateReadingTime(article.content || article.excerpt || '');
  return `<a class="card" href="/articles/${escapeHtml(article.slug)}">
    ${article.featuredImage ? `<img src="${escapeHtml(article.featuredImage)}" alt="${escapeHtml(article.featuredImageAlt || article.title)}" loading="lazy" />` : ''}
    <div class="card-body">
      <div class="meta">${escapeHtml(article.category)}</div>
      <h2>${escapeHtml(article.title)}</h2>
      <p class="excerpt">${escapeHtml(article.excerpt)}</p>
      <div class="byline"><span>${escapeHtml(article.author)}</span><span>${date} · ${readingTime} min read</span></div>
    </div>
  </a>`;
}

export async function createApp(options: CreateAppOptions = {}) {
  const serveStatic = options.serveStatic ?? process.env.NODE_ENV === 'production';
  const runStartupChecks = options.runStartupChecks ?? true;
  const app = express();

  // Trust proxy for HTTPS protocol resolution behind Cloud Run / reverse proxies
  app.set('trust proxy', 1);

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // CORS Policy: allow local/preview origins in dev, and configured app origins in production
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      process.env.APP_URL,
      process.env.PUBLIC_APP_URL,
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ].filter(Boolean) as string[];

    if (origin) {
      if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin) || allowedOrigins.some(ao => origin.startsWith(ao))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token, X-Customer-Token, X-Razorpay-Signature, X-Razorpay-Event-Id');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // JSON parsing middleware with raw body capture for webhook signature verification
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf-8');
      }
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Middleware to catch malformed JSON payloads gracefully
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Malformed JSON payload' });
    }
    next(err);
  });

  // Helper to log server requests in development
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API ${req.method}] ${req.path}`);
    }
    next();
  });

  // Security: Block direct public filesystem access to private storage folders and internal files
  app.use(['/storage', '/private_products', '/data', '/data/db.json'], (req, res) => {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Direct filesystem storage access is prohibited.'
    });
  });

  // ==========================================
  // PUBLIC API ROUTES
  // ==========================================

  // 1. Health check (Safe operational diagnostics - NO secrets exposed)
  app.get('/api/health', async (req, res) => {
    const emailStatus = emailService.getStatus();
    const dbStatus = await getDatabaseStatus();
    const storageStatus = await storageService.getStatus();
    res.json({
      status: 'ok',
      service: 'The Ngalung Atelier Digital Store API',
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      gateway: {
        provider: 'Razorpay',
        environment: 'TEST MODE',
        configured: razorpayService.isConfigured(),
        webhookConfigured: razorpayService.isWebhookConfigured()
      },
      email: {
        provider: emailStatus.provider,
        configured: emailStatus.configured
      },
      database: {
        status: dbStatus.status,
        provider: dbStatus.provider,
        authoritative: dbStatus.authoritative
      },
      storage: {
        status: storageStatus.status,
        provider: storageStatus.provider,
        authoritative: storageStatus.authoritative,
        bucket: storageStatus.bucket
      },
      persistence: {
        database: dbStatus.provider === 'PostgreSQL' ? 'postgresql' : 'local_json',
        fileStorage: storageStatus.providerKey === 'supabase' ? 'supabase_storage' : (storageStatus.providerKey === 's3' ? 's3_storage' : 'local_disk'),
        sessionStore: 'in_memory'
      },
      timestamp: new Date().toISOString()
    });
  });

  // 2. Public Store Info (Safe metadata for customer storefront - NO secrets or credentials)
  app.get('/api/store/info', (req, res) => {
    try {
      const settings = store.getSettings();
      const publicInfo: PublicStoreInfo = {
        storeName: settings.storeName,
        storeTagline: settings.storeTagline,
        creatorName: settings.creatorName,
        creatorBio: settings.creatorBio,
        creatorAvatar: settings.creatorAvatar,
        currency: settings.currency,
        supportEmail: settings.supportEmail || 'support@ngalungatelier.com',
        businessName: settings.businessName || 'The Ngalung Atelier',
        country: settings.country || 'India',
        refundPolicySummary: settings.refundPolicySummary,
        socialLinks: settings.socialLinks || {},
        discountCodes: (settings.discountCodes || []).filter(d => d.active)
      };
      res.json({ success: true, storeInfo: publicInfo });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Public Contact & Support Form Route
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, subject, message, orderNumber } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Please provide your full name (at least 2 characters).' });
      }

      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      }

      if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
        return res.status(400).json({ success: false, message: 'Please enter a subject for your message.' });
      }

      if (!message || typeof message !== 'string' || message.trim().length < 10) {
        return res.status(400).json({ success: false, message: 'Please enter your message (at least 10 characters).' });
      }

      const settings = store.getSettings();
      const supportEmail = settings.supportEmail || 'support@ngalungatelier.com';

      const delivery = await emailService.sendContactFormEmail({
        senderName: name.trim(),
        senderEmail: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        orderNumber: orderNumber ? String(orderNumber).trim() : undefined,
        storeName: settings.storeName,
        recipientEmail: supportEmail
      });

      res.json({
        success: true,
        message: `Thank you, ${name.trim()}! Your message has been received. Our team will get back to you at ${email.trim()} within 24-48 hours.`,
        deliveryStatus: delivery.status
      });
    } catch (err: any) {
      console.error('Contact form submission error:', err);
      res.status(500).json({ success: false, message: 'Unable to send message at this time. Please try again later.' });
    }
  });

  // Helper to sanitize product for public storefront consumption (strips gated vault URLs and storage keys)
  function sanitizePublicProduct(product: Product): Product {
    const { digitalAsset, ...rest } = product;
    const sanitizedDigitalAsset = digitalAsset ? {
      type: digitalAsset.type,
      fileSize: digitalAsset.fileSize,
      fileName: digitalAsset.fileName,
      accessInstructions: digitalAsset.accessInstructions,
      bonuses: digitalAsset.bonuses?.map(b => ({
        id: b.id,
        title: b.title,
        value: b.value,
        description: b.description
        // Strip bonus delivery URL from public catalog
      }))
    } : {
      type: 'file_download' as const,
      accessInstructions: 'Instant delivery after checkout'
    };

    return {
      ...rest,
      digitalAsset: sanitizedDigitalAsset as any
    };
  }

  // 3. Public Products API (Returns only published products for visitors, with gated vault data stripped)
  app.get('/api/products', (req, res) => {
    try {
      const all = store.getProducts();
      const published = all.filter(p => p.isPublished).map(sanitizePublicProduct);
      res.json({ success: true, products: published });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/products/:slugOrId', (req, res) => {
    try {
      const { slugOrId } = req.params;
      const product = store.getProductBySlug(slugOrId) || store.getProductById(slugOrId);
      if (!product || !product.isPublished) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      res.json({ success: true, product: sanitizePublicProduct(product) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Public Articles API (published articles only)
  app.get('/api/articles', async (req, res) => {
    try {
      const { category = '', search = '' } = req.query;
      const articles = await getActiveStore().getArticles(false);
      const normalizedCategory = String(category).trim().toLowerCase();
      const normalizedSearch = String(search).trim().toLowerCase();
      const filtered = articles.filter(article => {
        const matchesCategory = !normalizedCategory || article.category.toLowerCase() === normalizedCategory;
        const matchesSearch = !normalizedSearch ||
          article.title.toLowerCase().includes(normalizedSearch) ||
          article.excerpt.toLowerCase().includes(normalizedSearch) ||
          article.category.toLowerCase().includes(normalizedSearch) ||
          (article.tags || []).some(tag => tag.toLowerCase().includes(normalizedSearch));
        return matchesCategory && matchesSearch;
      });
      res.json({ success: true, articles: filtered });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/articles/:slug', async (req, res) => {
    try {
      const article = await getActiveStore().getArticleBySlug(req.params.slug, false);
      if (!article) {
        return res.status(404).json({ success: false, message: 'Article not found' });
      }
      const relatedArticles = await getActiveStore().getRelatedArticles(article, 3);
      res.json({ success: true, article, relatedArticles });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/articles', async (req, res) => {
    try {
      const baseUrl = getBaseUrl(req);
      const articles = await getActiveStore().getArticles(false);
      const head = `
        <meta name="description" content="Practical guides on freelancing, client acquisition, marketing, AI, digital business, and building better systems." />
        <link rel="canonical" href="${baseUrl}/articles" />
        <meta property="og:title" content="Articles & Guides | The Ngalung Atelier" />
        <meta property="og:description" content="Practical guides on freelancing, client acquisition, marketing, AI, digital business, and building better systems." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="${baseUrl}/articles" />
        <meta name="twitter:card" content="summary_large_image" />
      `;
      const body = `
        <header class="top"><div class="wrap top-inner"><a class="brand" href="/">The Ngalung Atelier</a><nav class="nav"><a href="/">Home</a><a href="/#products-catalog">Products</a><a href="/articles">Articles</a><a href="/#about-section">About</a><a href="/purchases">My Purchases</a></nav></div></header>
        <main>
          <section class="hero"><div class="wrap"><div class="eyebrow">Articles & Guides</div><h1>Practical systems for better digital business.</h1><p class="lead">Practical guides on freelancing, client acquisition, marketing, AI, digital business, and building better systems.</p></div></section>
          <section class="wrap">${articles.length ? `<div class="grid">${articles.map(renderArticleCard).join('')}</div>` : '<div class="empty">No published articles yet.</div>'}</section>
        </main>
        <footer><div class="wrap">© ${new Date().getFullYear()} The Ngalung Atelier. Handcrafted digital products and practical guides.</div></footer>
      `;
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
      res.send(articleShell('Articles & Guides | The Ngalung Atelier', body, head));
    } catch (err: any) {
      res.status(500).send('Unable to load articles.');
    }
  });

  app.get('/articles/:slug', async (req, res, next) => {
    try {
      const article = await getActiveStore().getArticleBySlug(req.params.slug, false);
      if (!article) return next();
      const baseUrl = getBaseUrl(req);
      const meta = buildArticleMeta(article, baseUrl);
      const relatedArticles = await getActiveStore().getRelatedArticles(article, 3);
      const publishedDate = article.publishedAt || article.createdAt;
      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.title,
        description: meta.description,
        author: { '@type': 'Person', name: article.author },
        datePublished: publishedDate,
        dateModified: article.updatedAt,
        image: meta.image ? [meta.image] : undefined,
        mainEntityOfPage: { '@type': 'WebPage', '@id': meta.canonicalUrl }
      };
      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Articles', item: `${baseUrl}/articles` },
          { '@type': 'ListItem', position: 3, name: article.title, item: meta.canonicalUrl }
        ]
      };
      const date = new Date(publishedDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      const updated = new Date(article.updatedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      const head = `
        <meta name="description" content="${escapeHtml(meta.description)}" />
        <link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />
        <meta property="og:title" content="${escapeHtml(meta.ogTitle)}" />
        <meta property="og:description" content="${escapeHtml(meta.ogDescription)}" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />
        ${meta.image ? `<meta property="og:image" content="${escapeHtml(meta.image)}" />` : ''}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${escapeHtml(article.socialShareTitle || meta.ogTitle)}" />
        <meta name="twitter:description" content="${escapeHtml(article.socialShareDescription || meta.ogDescription)}" />
        ${meta.image ? `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />` : ''}
        <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
      `;
      const body = `
        <header class="top"><div class="wrap top-inner"><a class="brand" href="/">The Ngalung Atelier</a><nav class="nav"><a href="/">Home</a><a href="/#products-catalog">Products</a><a href="/articles">Articles</a><a href="/#about-section">About</a><a href="/purchases">My Purchases</a></nav></div></header>
        <main class="article">
          <nav class="eyebrow"><a href="/">Home</a> &gt; <a href="/articles">Articles</a> &gt; ${escapeHtml(article.category)}</nav>
          <article>
            <header>
              <div class="meta">${escapeHtml(article.category)}</div>
              <h1>${escapeHtml(article.title)}</h1>
              <p class="lead">${escapeHtml(article.excerpt)}</p>
              <div class="byline"><span>By ${escapeHtml(article.author)}</span><span>${date} · Updated ${updated} · ${calculateReadingTime(article.content || article.excerpt)} min read</span></div>
              ${article.featuredImage ? `<img class="article-cover" src="${escapeHtml(article.featuredImage)}" alt="${escapeHtml(article.featuredImageAlt || article.title)}" />` : ''}
            </header>
            <section class="article-body">${article.content ? renderArticleMarkdown(article.content) : '<p>This article is being prepared.</p>'}</section>
          </article>
          ${relatedArticles.length ? `<section><div class="eyebrow">Related Articles</div><div class="grid">${relatedArticles.map(renderArticleCard).join('')}</div></section>` : ''}
        </main>
        <footer><div class="wrap">© ${new Date().getFullYear()} The Ngalung Atelier.</div></footer>
      `;
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
      res.send(articleShell(`${meta.title} | The Ngalung Atelier`, body, head));
    } catch (err) {
      next(err);
    }
  });

  app.get('/robots.txt', (_req, res) => {
    const baseUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL || '';
    res.type('text/plain').send(`User-agent: *
Allow: /
Allow: /articles
Disallow: /admin
Disallow: /api/admin
Disallow: /storage
Disallow: /data

${baseUrl ? `Sitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml` : 'Sitemap: /sitemap.xml'}
`);
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = getBaseUrl(req);
      const activeStore = getActiveStore();
      const [products, articles] = await Promise.all([
        activeStore.getProducts(),
        activeStore.getArticles(false)
      ]);
      const urls = [
        { loc: `${baseUrl}/`, lastmod: new Date().toISOString() },
        { loc: `${baseUrl}/articles`, lastmod: new Date().toISOString() },
        { loc: `${baseUrl}/terms`, lastmod: new Date().toISOString() },
        { loc: `${baseUrl}/privacy`, lastmod: new Date().toISOString() },
        ...products.filter((p: Product) => p.isPublished).map((p: Product) => ({ loc: `${baseUrl}/p/${p.slug}`, lastmod: p.updatedAt || p.createdAt })),
        ...articles.map((a: Article) => ({ loc: `${baseUrl}/articles/${a.slug}`, lastmod: a.updatedAt || a.publishedAt || a.createdAt }))
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${xmlEscape(url.loc)}</loc><lastmod>${xmlEscape(new Date(url.lastmod).toISOString())}</lastmod></url>`).join('\n')}
</urlset>`;
      res.type('application/xml').send(xml);
    } catch (err: any) {
      res.status(500).type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><error>${xmlEscape(err.message || 'Sitemap failed')}</error>`);
    }
  });

  // ==========================================
  // PAYMENT & CHECKOUT API ROUTES (TEST MODE SAFE FALLBACK)
  // ==========================================

  // Public non-sensitive payment availability endpoint (NO SECRETS EXPOSED)
  app.get('/api/payments/config', (req, res) => {
    res.json({
      success: true,
      configured: razorpayService.isConfigured(),
      provider: 'Razorpay',
      environment: 'TEST MODE',
      currency: razorpayService.getCurrency()
    });
  });

  app.get('/api/payments/status', (req, res) => {
    res.json({
      success: true,
      configured: razorpayService.isConfigured(),
      provider: 'Razorpay',
      environment: 'TEST MODE',
      currency: razorpayService.getCurrency()
    });
  });

  // Admin Payment Gateway Diagnostic Status (Strictly requireAdmin protected)
  const handleAdminGatewayStatus = (req: express.Request, res: express.Response) => {
    res.json({
      success: true,
      gateway: razorpayService.getGatewayStatus()
    });
  };
  app.get('/api/admin/gateway-status', requireAdmin, handleAdminGatewayStatus);
  app.get('/api/admin/payments/razorpay/status', requireAdmin, handleAdminGatewayStatus);

  // Admin Razorpay Test Connection Endpoint (Safely verifies test credentials with Razorpay API)
  const handleAdminTestConnection = async (req: express.Request, res: express.Response) => {
    try {
      const result = await razorpayService.testConnection();
      res.json({
        success: result.connected,
        connected: result.connected,
        message: result.message,
        gateway: razorpayService.getGatewayStatus()
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        connected: false,
        message: `Razorpay TEST connection failed: ${err.message || 'Unknown error'}`
      });
    }
  };
  app.post('/api/admin/payments/razorpay/test-connection', requireAdmin, handleAdminTestConnection);
  app.post('/api/admin/payments/test-connection', requireAdmin, handleAdminTestConnection);

  // Handler for creating payment orders
  const handleCreatePaymentOrder = async (req: AuthenticatedCustomerRequest, res: express.Response) => {
    try {
      const customer = req.customer;
      if (!customer) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Please sign in or create an account to continue.'
        });
      }

      // 1. Safe Fallback Check: Check if Razorpay credentials exist
      if (!razorpayService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'PAYMENT_UNAVAILABLE',
          message: 'Online payment is temporarily unavailable.'
        });
      }

      const {
        productId,
        productSlug,
        buyerPhone,
        discountCode,
        utmSource = 'direct'
      } = req.body;

      const targetIdOrSlug = productId || productSlug;
      if (!targetIdOrSlug) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Product ID or slug is required'
        });
      }

      // Authoritative product retrieval from server store
      const product = store.getProductById(targetIdOrSlug) || store.getProductBySlug(targetIdOrSlug);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Selected product was not found'
        });
      }

      if (!product.isPublished) {
        return res.status(400).json({
          success: false,
          error: 'Unavailable',
          message: 'This product is currently not published for purchase'
        });
      }

      // Authoritative duplicate purchase check: if customer already owns a paid order for this product
      const existingPaidOrder = store.getOrdersByCustomer({ id: customer.id, email: customer.email }).find(
        o => (o.productId === product.id || o.productSlug === product.slug) && o.status === 'paid'
      );
      if (existingPaidOrder) {
        return res.status(200).json({
          success: true,
          alreadyOwned: true,
          message: 'You already own this product. Your access is active.',
          orderNumber: existingPaidOrder.orderNumber,
          accessToken: existingPaidOrder.accessToken,
          accessUrl: `/access/${existingPaidOrder.accessToken}`,
          product: {
            id: product.id,
            title: product.title,
            category: product.category
          }
        });
      }

      // Authoritative server-side price calculation (Client-submitted price/amount is strictly IGNORED)
      const basePrice = product.priceINR;
      let discountAmount = 0;
      let appliedDiscountCode: string | undefined = undefined;

      if (discountCode) {
        const settings = store.getSettings();
        const foundDiscount = (settings.discountCodes || []).find(
          d => d.active && d.code.toUpperCase() === String(discountCode).trim().toUpperCase()
        );
        if (foundDiscount) {
          discountAmount = Math.round((basePrice * foundDiscount.discountPercent) / 100);
          appliedDiscountCode = foundDiscount.code;
        }
      }

      const finalAmount = Math.max(1, basePrice - discountAmount);
      const currency = 'INR';

      // Create internal order with PENDING status associated with authenticated customer
      const internalOrder = store.createOrder({
        productId: product.id,
        productSlug: product.slug,
        productTitle: product.title,
        productCover: product.coverImage,
        productCategory: product.category,
        customerId: customer.id,
        buyerName: customer.name,
        buyerEmail: customer.email,
        buyerPhone: buyerPhone ? String(buyerPhone).trim() : '',
        amount: finalAmount,
        currency: currency,
        discountCode: appliedDiscountCode,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        status: 'pending', // CRITICAL: Must remain pending until verified
        utmSource: utmSource
      });

      // Log checkout start analytics event
      store.logEvent({
        productId: product.id,
        productSlug: product.slug,
        type: 'checkout_start',
        source: utmSource,
        path: `/checkout/${product.slug}`,
        amount: finalAmount
      });

      // Create Razorpay Order on server
      const rzpResult = await razorpayService.createOrder({
        amount: finalAmount,
        currency: currency,
        receipt: internalOrder.orderNumber,
        notes: {
          internalOrderId: internalOrder.id,
          orderNumber: internalOrder.orderNumber,
          productId: product.id,
          customerId: customer.id,
          buyerEmail: customer.email
        }
      });

      // Associate Razorpay order ID with local order
      store.updateOrderStatus(internalOrder.id, 'pending', {
        razorpayOrderId: rzpResult.razorpayOrderId
      });

      // Return only necessary frontend checkout data (Secrets are NEVER returned)
      res.json({
        success: true,
        orderId: internalOrder.id,
        orderNumber: internalOrder.orderNumber,
        amount: rzpResult.amountInSubunits, // amount in paise (e.g. 49900)
        amountINR: finalAmount,
        currency: currency,
        razorpayOrderId: rzpResult.razorpayOrderId,
        keyId: razorpayService.getPublicKeyId(),
        product: {
          id: product.id,
          title: product.title,
          category: product.category
        },
        order: {
          id: internalOrder.id,
          orderNumber: internalOrder.orderNumber,
          amount: finalAmount,
          currency: currency,
          productTitle: product.title,
          buyerEmail: customer.email,
          buyerName: customer.name
        },
        razorpay: {
          orderId: rzpResult.razorpayOrderId,
          amount: rzpResult.amountInSubunits,
          currency: currency,
          keyId: razorpayService.getPublicKeyId()
        }
      });
    } catch (err: any) {
      if (err.message === 'PAYMENT_UNAVAILABLE') {
        return res.status(503).json({
          success: false,
          error: 'PAYMENT_UNAVAILABLE',
          message: 'Online payment is temporarily unavailable.'
        });
      }
      console.error('Order creation error:', err);
      res.status(500).json({
        success: false,
        error: 'Unable to start payment. Please try again.',
        message: 'Online payment is temporarily unavailable.'
      });
    }
  };

  // Endpoint aliases for order creation
  app.post('/api/payments/create-order', requireCustomerAuth, handleCreatePaymentOrder);
  app.post('/api/orders/create', requireCustomerAuth, handleCreatePaymentOrder);

  // Handler for payment verification
  const handleVerifyPayment = async (req: AuthenticatedCustomerRequest, res: express.Response) => {
    try {
      const customer = req.customer;
      if (!customer) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Customer authentication required for payment verification.'
        });
      }

      // Safe Fallback Check: Reject verification if Razorpay is not configured
      if (!razorpayService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'PAYMENT_UNAVAILABLE',
          message: 'Online payment is temporarily unavailable.'
        });
      }

      const {
        orderId,
        internalOrderId,
        razorpayOrderId,
        razorpay_order_id,
        razorpayPaymentId,
        razorpay_payment_id,
        razorpaySignature,
        razorpay_signature,
        paymentMethod = 'RAZORPAY'
      } = req.body;

      const targetOrderId = orderId || internalOrderId;
      const targetRzpOrderId = razorpay_order_id || razorpayOrderId;
      const targetRzpPaymentId = razorpay_payment_id || razorpayPaymentId;
      const targetRzpSignature = razorpay_signature || razorpaySignature;

      // Find local order record using server store
      const order =
        (targetOrderId ? store.getOrderById(targetOrderId) : undefined) ||
        (targetRzpOrderId ? store.getOrderByRazorpayOrderId(targetRzpOrderId) : undefined);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order record not found',
          message: 'Unable to locate order record for verification.'
        });
      }

      // Security check: Strict customer order ownership verification
      const isOwner =
        (Boolean(order.customerId) && order.customerId === customer.id) ||
        (Boolean(order.buyerEmail) && order.buyerEmail.toLowerCase() === customer.email.toLowerCase());

      if (!isOwner) {
        console.warn(`[SECURITY AUDIT] Order ownership mismatch: Order ${order.id} owned by (${order.customerId} / ${order.buyerEmail}), verification attempted by (${customer.id} / ${customer.email})`);
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You are not authorized to verify or access this order.'
        });
      }

      // Verify product validity and association
      const product = store.getProductById(order.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Purchased product record could not be found.'
        });
      }

      // Idempotency: If order was already verified and marked paid, return success immediately
      // ONLY after verifying customer ownership above
      if (order.status === 'paid') {
        return res.json({
          success: true,
          orderNumber: order.orderNumber,
          accessToken: order.accessToken,
          accessUrl: `/access/${order.accessToken}`,
          message: 'Payment already verified! Access granted.'
        });
      }

      // Check if order was already refunded
      if (order.status === 'refunded') {
        return res.status(400).json({
          success: false,
          error: 'Order Refunded',
          message: 'This order has been refunded. Access cannot be granted.'
        });
      }

      // Server-stored Razorpay Order ID for cryptographic verification
      const authoritativeRzpOrderId = order.razorpayOrderId || targetRzpOrderId || '';

      // Cryptographic signature verification using HMAC-SHA256
      const verification = razorpayService.verifyPaymentSignature({
        razorpayOrderId: authoritativeRzpOrderId,
        razorpayPaymentId: targetRzpPaymentId || '',
        razorpaySignature: targetRzpSignature || ''
      });

      if (!verification.valid) {
        console.warn(`[SECURITY AUDIT] Signature verification failed for Order ${order.orderNumber}: ${verification.error}`);
        // CRITICAL SECURITY FIX: Do NOT mark the order as 'failed' in the database on client verification rejection.
        // The pending order remains in 'pending' status so authentic Razorpay webhooks can still establish the final paid state.
        return res.status(400).json({
          success: false,
          error: 'Payment verification failed',
          message: 'Payment signature could not be verified. Access is not granted.'
        });
      }

      // Transition order status to PAID
      const updatedOrder = store.updateOrderStatus(order.id, 'paid', {
        razorpayOrderId: authoritativeRzpOrderId,
        razorpayPaymentId: targetRzpPaymentId,
        razorpaySignature: targetRzpSignature,
        gatewayPaymentId: targetRzpPaymentId,
        paymentMethod: paymentMethod as any
      });

      if (!updatedOrder) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update order status'
        });
      }

      // Fulfillment email delivery (only if not already sent)
      if (!updatedOrder.fulfillmentEmailSent && updatedOrder.emailDeliveryStatus !== 'sent') {
        try {
          const settings = store.getSettings();
          const delivery = await emailService.sendOrderFulfillmentEmail({
            order: updatedOrder,
            product,
            accessUrl: `/access/${updatedOrder.accessToken}`,
            supportEmail: settings.supportEmail || 'support@ngalungatelier.com',
            storeName: settings.storeName || 'The Ngalung Atelier',
            licenseKey: product.digitalAsset?.licenseKey
          });

          store.recordEmailDelivery(updatedOrder.id, delivery.status, delivery.error);
        } catch (emailErr: any) {
          console.error('[EMAIL DISPATCH ERROR (NON-FATAL)] Failed to deliver fulfillment email:', emailErr);
          store.recordEmailDelivery(updatedOrder.id, 'failed', emailErr.message || 'Email dispatch exception');
        }
      }

      res.json({
        success: true,
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        paymentId: updatedOrder.gatewayPaymentId || targetRzpPaymentId,
        productTitle: product.title,
        amount: updatedOrder.amount,
        currency: updatedOrder.currency,
        paidAt: updatedOrder.paidAt || new Date().toISOString(),
        accessToken: updatedOrder.accessToken,
        accessUrl: `/access/${updatedOrder.accessToken}`,
        message: 'Payment verified successfully! Your product is now available in My Purchases.'
      });
    } catch (err: any) {
      console.error('Payment verification exception:', err);
      res.status(500).json({
        success: false,
        error: 'Payment verification failed',
        message: 'Unable to complete verification. Please try again.'
      });
    }
  };

  // Endpoint aliases for payment verification
  app.post('/api/payments/verify', requireCustomerAuth, handleVerifyPayment);
  app.post('/api/orders/verify', requireCustomerAuth, handleVerifyPayment);

  // 6. Razorpay Webhook Receiver (Server-to-Server Asynchronous Confirmation)
  const handleRazorpayWebhook = async (req: express.Request, res: express.Response) => {
    try {
      // 1. Webhook Secret Check: If RAZORPAY_WEBHOOK_SECRET is missing, do not process
      const webhookSecret = razorpayService.getWebhookSecret();
      if (!webhookSecret) {
        console.warn('[SECURITY] Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not configured on server.');
        return res.status(503).json({
          success: false,
          error: 'WEBHOOK_UNCONFIGURED',
          message: 'Razorpay webhook secret is not configured on the server.'
        });
      }

      // 2. Signature Header Check
      const signature = (req.headers['x-razorpay-signature'] || req.get('x-razorpay-signature') || '') as string;
      if (!signature) {
        console.warn('[SECURITY] Rejected Razorpay webhook: missing X-Razorpay-Signature header');
        return res.status(400).json({ error: 'Missing X-Razorpay-Signature header' });
      }

      // 3. Raw Body Check (Never use JSON.stringify(req.body))
      const rawBody = (req as any).rawBody;
      if (!rawBody || typeof rawBody !== 'string' || rawBody.length === 0) {
        console.warn('[SECURITY] Rejected Razorpay webhook: missing raw request body for verification');
        return res.status(400).json({ error: 'Missing raw request body' });
      }

      // 4. HMAC-SHA256 Signature Verification
      if (!razorpayService.verifyWebhookSignature(rawBody, signature)) {
        console.warn('[SECURITY] Rejected Razorpay webhook due to invalid signature');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }

      // 5. Payload Structural Validation
      const event = req.body;
      if (!event || typeof event !== 'object' || typeof event.event !== 'string') {
        return res.status(400).json({ error: 'Invalid webhook payload structure' });
      }

      // 6. Event Idempotency Check
      const eventId = (event.id || req.headers['x-razorpay-event-id'] || '') as string;
      if (eventId && store.hasProcessedWebhookEvent(eventId)) {
        console.log(`[RAZORPAY WEBHOOK] Duplicate event ${eventId} (${event.event}) acknowledged safely.`);
        return res.json({
          status: 'ok',
          received: true,
          duplicate: true,
          message: `Event ${eventId} has already been processed.`
        });
      }

      console.log(`[RAZORPAY WEBHOOK] Validated event received: ${event.event}${eventId ? ` [${eventId}]` : ''}`);

      // 7. Event Routing & Processing
      if (event.event === 'payment.captured' || event.event === 'order.paid') {
        const paymentPayload = event.payload?.payment?.entity;
        const orderPayload = event.payload?.order?.entity;
        const notes = paymentPayload?.notes || orderPayload?.notes || {};

        const internalOrderId = notes.internalOrderId || notes.orderId;
        const rzpOrderId = paymentPayload?.order_id || orderPayload?.id;
        const receipt = orderPayload?.receipt || notes.orderNumber;

        const order =
          (internalOrderId ? store.getOrderById(internalOrderId) : undefined) ||
          (rzpOrderId ? store.getOrderByRazorpayOrderId(rzpOrderId) : undefined) ||
          (receipt ? (store.getOrderById(receipt) || store.getOrders().find(o => o.orderNumber === receipt)) : undefined);

        if (!order) {
          console.warn(`[RAZORPAY WEBHOOK] No matching local order found for event: ${event.event}, rzpOrderId: ${rzpOrderId}, internalOrderId: ${internalOrderId}`);
          if (eventId) store.recordWebhookEvent(eventId, event.event);
          return res.json({ status: 'ok', received: true, message: 'No matching local order record found' });
        }

        // Security Check: Product association
        const product = store.getProductById(order.productId) || store.getProductBySlug(order.productSlug);
        if (!product) {
          console.warn(`[RAZORPAY WEBHOOK SECURITY] Product ${order.productId} not found in catalog.`);
          return res.status(400).json({ error: 'Product association invalid' });
        }

        // Security Check: Razorpay Order ID consistency (if present on order)
        if (order.razorpayOrderId && rzpOrderId && order.razorpayOrderId !== rzpOrderId) {
          console.warn(`[RAZORPAY WEBHOOK SECURITY] Razorpay Order ID mismatch: stored=${order.razorpayOrderId}, incoming=${rzpOrderId}`);
          return res.status(400).json({ error: 'Order ID mismatch' });
        }

        // Security Check: Amount verification (in subunits)
        const paidAmountSubunits = paymentPayload?.amount || orderPayload?.amount;
        const expectedSubunits = Math.round(order.amount * 100);
        if (paidAmountSubunits !== undefined && Number(paidAmountSubunits) !== expectedSubunits) {
          console.warn(`[RAZORPAY WEBHOOK SECURITY] Amount mismatch: expected ${expectedSubunits} subunits, received ${paidAmountSubunits}`);
          return res.status(400).json({ error: 'Amount mismatch' });
        }

        // Security Check: Currency verification
        const paidCurrency = (paymentPayload?.currency || orderPayload?.currency || '').toUpperCase();
        if (paidCurrency && paidCurrency !== order.currency.toUpperCase()) {
          console.warn(`[RAZORPAY WEBHOOK SECURITY] Currency mismatch: expected ${order.currency}, received ${paidCurrency}`);
          return res.status(400).json({ error: 'Currency mismatch' });
        }

        // Idempotency: If order is already paid, partially_refunded, or refunded, handle safely
        if (order.status === 'refunded' || order.status === 'partially_refunded') {
          console.log(`[RAZORPAY WEBHOOK] Order ${order.orderNumber} is already in status '${order.status}'. Preserving refund status.`);
          if (eventId) store.recordWebhookEvent(eventId, event.event, order.id);
          return res.json({
            status: 'ok',
            received: true,
            alreadyFinalized: true,
            orderNumber: order.orderNumber,
            currentStatus: order.status
          });
        }

        if (order.status === 'paid') {
          console.log(`[RAZORPAY WEBHOOK] Order ${order.orderNumber} is already marked PAID. Idempotent no-op.`);
          if (eventId) store.recordWebhookEvent(eventId, event.event, order.id);
          return res.json({
            status: 'ok',
            received: true,
            alreadyPaid: true,
            orderNumber: order.orderNumber
          });
        }

        // Transition order status to PAID
        const updated = store.updateOrderStatus(order.id, 'paid', {
          razorpayOrderId: rzpOrderId || order.razorpayOrderId,
          razorpayPaymentId: paymentPayload?.id || order.razorpayPaymentId,
          gatewayPaymentId: paymentPayload?.id || order.gatewayPaymentId,
          paymentMethod: 'RAZORPAY'
        });

        // Send fulfillment email (idempotent: only if not already delivered)
        if (updated && !updated.fulfillmentEmailSent && updated.emailDeliveryStatus !== 'sent') {
          try {
            const settings = store.getSettings();
            const delivery = await emailService.sendOrderFulfillmentEmail({
              order: updated,
              product,
              accessUrl: `/access/${updated.accessToken}`,
              supportEmail: settings.supportEmail || 'support@ngalungatelier.com',
              storeName: settings.storeName || 'The Ngalung Atelier',
              licenseKey: product.digitalAsset?.licenseKey
            });
            store.recordEmailDelivery(updated.id, delivery.status, delivery.error);
          } catch (emailErr: any) {
            console.error('[WEBHOOK EMAIL DISPATCH ERROR]', emailErr);
            store.recordEmailDelivery(updated.id, 'failed', emailErr.message);
          }
        }

        if (eventId) {
          store.recordWebhookEvent(eventId, event.event, order.id);
        }

        return res.json({
          status: 'ok',
          received: true,
          orderNumber: order.orderNumber,
          statusTransition: 'paid'
        });
      } else if (event.event === 'refund.processed' || event.event === 'refund.created' || event.event === 'refund.failed') {
        // Handle Razorpay Refund Webhook Events
        const refundPayload = event.payload?.refund?.entity;
        const paymentPayload = event.payload?.payment?.entity;
        const notes = refundPayload?.notes || paymentPayload?.notes || {};
        const internalOrderId = notes.internalOrderId || notes.orderId;
        const rzpPaymentId = refundPayload?.payment_id || paymentPayload?.id;
        const rzpOrderId = paymentPayload?.order_id;
        const rzpRefundId = refundPayload?.id;

        const order =
          (internalOrderId ? store.getOrderById(internalOrderId) : undefined) ||
          (rzpRefundId ? store.getOrderByRefundId(rzpRefundId) : undefined) ||
          (rzpPaymentId ? store.getOrderByRazorpayPaymentId(rzpPaymentId) : undefined) ||
          (rzpOrderId ? store.getOrderByRazorpayOrderId(rzpOrderId) : undefined);

        if (!order) {
          console.warn(`[RAZORPAY WEBHOOK] No matching local order found for refund event: ${event.event}, refundId: ${rzpRefundId}, paymentId: ${rzpPaymentId}`);
          if (eventId) store.recordWebhookEvent(eventId, event.event);
          return res.json({ status: 'ok', received: true, message: 'No matching order found for refund event' });
        }

        // Calculate refund amount from subunits (paise to INR)
        const refundSubunits = refundPayload?.amount;
        let refundAmount = order.amount;
        if (refundSubunits !== undefined && refundSubunits !== null) {
          const converted = Math.round(Number(refundSubunits) / 100);
          if (!isNaN(converted) && converted > 0) {
            refundAmount = converted;
          }
        }

        const isFullRefund = refundAmount >= order.amount;
        const refundCurrency = (refundPayload?.currency || order.currency || 'INR').toUpperCase();
        const refundCreatedAtEpoch = refundPayload?.created_at;
        const refundCreatedAtIso = refundCreatedAtEpoch ? new Date(refundCreatedAtEpoch * 1000).toISOString() : new Date().toISOString();

        if (event.event === 'refund.processed') {
          const newStatus: OrderStatus = isFullRefund ? 'refunded' : 'partially_refunded';
          console.log(`[RAZORPAY WEBHOOK] Refund processed for order ${order.orderNumber}. Transitioning to ${newStatus} (Refund: ₹${refundAmount}/${order.amount})`);
          
          store.updateOrderStatus(order.id, newStatus, {
            refundAmount,
            refundCurrency,
            refundStatus: 'processed',
            razorpayRefundId: rzpRefundId || order.razorpayRefundId,
            refundCreatedAt: order.refundCreatedAt || refundCreatedAtIso,
            refundProcessedAt: new Date().toISOString(),
            refundNotes: notes
          });
        } else if (event.event === 'refund.created') {
          // If order is not already finalized as refunded
          if (order.status !== 'refunded') {
            const newStatus: OrderStatus = isFullRefund ? 'refunded' : 'partially_refunded';
            console.log(`[RAZORPAY WEBHOOK] Refund created for order ${order.orderNumber}. Marking ${newStatus} with status 'created'`);
            
            store.updateOrderStatus(order.id, newStatus, {
              refundAmount,
              refundCurrency,
              refundStatus: 'created',
              razorpayRefundId: rzpRefundId || order.razorpayRefundId,
              refundCreatedAt: refundCreatedAtIso,
              refundNotes: notes
            });
          }
        } else if (event.event === 'refund.failed') {
          console.warn(`[RAZORPAY WEBHOOK] Refund failed for order ${order.orderNumber}, refundId: ${rzpRefundId}`);
          if (order.status !== 'refunded') {
            store.updateOrderStatus(order.id, order.status, {
              refundStatus: 'failed',
              razorpayRefundId: rzpRefundId || order.razorpayRefundId,
              refundNotes: { ...notes, failureReason: refundPayload?.error_description || 'Refund processing failed on gateway' }
            });
          }
        }

        if (eventId) {
          store.recordWebhookEvent(eventId, event.event, order.id);
        }

        return res.json({
          status: 'ok',
          received: true,
          event: event.event,
          orderNumber: order.orderNumber,
          refundStatus: isFullRefund ? 'refunded' : 'partially_refunded'
        });
      } else if (event.event === 'payment.failed') {
        const paymentPayload = event.payload?.payment?.entity;
        const notes = paymentPayload?.notes || {};
        const internalOrderId = notes.internalOrderId || notes.orderId;
        const rzpOrderId = paymentPayload?.order_id;

        const order =
          (internalOrderId ? store.getOrderById(internalOrderId) : undefined) ||
          (rzpOrderId ? store.getOrderByRazorpayOrderId(rzpOrderId) : undefined);

        if (order) {
          // CRITICAL REQUIREMENT 9: Never downgrade an already PAID or REFUNDED order to FAILED
          if (order.status === 'paid' || order.status === 'refunded') {
            console.log(`[RAZORPAY WEBHOOK] Ignoring payment.failed for order ${order.orderNumber} with existing status: '${order.status}'`);
            if (eventId) store.recordWebhookEvent(eventId, event.event, order.id);
            return res.json({
              status: 'ok',
              received: true,
              ignored: true,
              message: `Order is already in finalized status '${order.status}'`
            });
          }

          // Safe to mark pending order as failed
          store.updateOrderStatus(order.id, 'failed', {
            razorpayPaymentId: paymentPayload?.id,
            gatewayPaymentId: paymentPayload?.id
          });
        }

        if (eventId) {
          store.recordWebhookEvent(eventId, event.event, order?.id);
        }

        return res.json({ status: 'ok', received: true, event: 'payment.failed' });
      } else {
        // Any other event types (e.g. payment.authorized, refund.processed, etc.)
        console.log(`[RAZORPAY WEBHOOK] Acknowledging unhandled event: ${event.event}`);
        if (eventId) {
          store.recordWebhookEvent(eventId, event.event);
        }
        return res.json({ status: 'ok', received: true, ignored: true, event: event.event });
      }
    } catch (err: any) {
      console.error('Webhook handling exception:', err);
      res.status(500).json({ error: err.message || 'Internal webhook error' });
    }
  };

  // Endpoint aliases for webhooks
  app.post('/api/webhooks/razorpay', handleRazorpayWebhook);
  app.post('/api/webhook/razorpay', handleRazorpayWebhook);

  // 7. Gated Protected Access Endpoint (Strict Server-Side Status Check)
  app.get('/api/access/:token', (req, res) => {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({ valid: false, message: 'Access token is required' });
      }

      const order = store.getOrderByAccessToken(token);
      if (!order) {
        return res.status(403).json({
          valid: false,
          message: 'Invalid access token. Please verify the URL or complete checkout.'
        });
      }

      // Handle Refunded orders (Part 14)
      if (order.status === 'refunded') {
        return res.status(403).json({
          valid: false,
          status: 'refunded',
          orderNumber: order.orderNumber,
          refundAmount: order.refundAmount,
          refundStatus: order.refundStatus,
          message: 'Access revoked. This order has been refunded.'
        });
      }

      // Strict server-side check: Must be PAID or PARTIALLY_REFUNDED (Part 11)
      if (order.status !== 'paid' && order.status !== 'partially_refunded') {
        return res.status(403).json({
          valid: false,
          status: order.status,
          orderNumber: order.orderNumber,
          productSlug: order.productSlug,
          message: 'Payment is pending. You will receive access as soon as payment is confirmed.'
        });
      }

      const product = store.getProductById(order.productId);
      if (!product) {
        return res.status(404).json({
          valid: false,
          message: 'Associated product could not be found'
        });
      }

      // Generate a deterministic license key for the customer
      const hash = crypto
        .createHash('md5')
        .update(`${order.id}-${order.buyerEmail}-${product.id}`)
        .digest('hex')
        .substring(0, 10)
        .toUpperCase();
      const prefix = product.digitalAsset.licenseKeyPrefix || 'CREATOR';
      const licenseKey = `${prefix}-${hash.slice(0, 5)}-${hash.slice(5, 10)}`;

      res.json({
        valid: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          buyerName: order.buyerName,
          buyerEmail: order.buyerEmail,
          amount: order.amount,
          currency: order.currency,
          paidAt: order.paidAt || order.createdAt,
          status: order.status,
          refundAmount: order.refundAmount,
          refundStatus: order.refundStatus,
          productTitle: order.productTitle,
          productCategory: order.productCategory
        },
        product: {
          id: product.id,
          title: product.title,
          slug: product.slug,
          coverImage: product.coverImage,
          digitalAsset: product.digitalAsset
        },
        licenseKey,
        message: 'Authorized: Access granted to digital assets'
      });
    } catch (err: any) {
      res.status(500).json({ valid: false, error: err.message });
    }
  });

  // Static route for uploaded public cover images
  app.use('/uploads/covers', express.static(FileStorageService.getPublicCoversDir()));

  // 8. Secure Download File Route (Authoritative Paid Check & Private Stream)
  app.get('/api/access/:token/download/:assetId?', async (req, res) => {
    try {
      const { token } = req.params;
      const order = store.getOrderByAccessToken(token);

      if (!order) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Invalid access token' });
      }

      if (order.status === 'refunded') {
        return res.status(403).json({ success: false, message: 'Unauthorized: Order has been refunded. Access is revoked.' });
      }

      if (order.status !== 'paid' && order.status !== 'partially_refunded') {
        return res.status(403).json({ success: false, message: 'Unauthorized: Valid paid order required' });
      }

      const product = store.getProductById(order.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Check if product has a private stored file in object storage or local vault
      if (product.digitalAsset?.storageKey) {
        try {
          const downloadResult = await storageService.downloadPrivateFile(product.digitalAsset.storageKey);
          const rawName = product.digitalAsset.fileName || `${product.slug || 'product'}-digital-asset.zip`;
          const safeName = FileStorageService.sanitizeFilename(rawName);

          // Enforce strict download security headers
          res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
          res.setHeader('Content-Type', downloadResult.mimeType || product.digitalAsset.mimeType || 'application/octet-stream');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');

          if (downloadResult.contentLength) {
            res.setHeader('Content-Length', downloadResult.contentLength.toString());
          }

          if (downloadResult.stream) {
            downloadResult.stream.on('error', (streamErr) => {
              console.error('[STORAGE STREAM ERROR]:', streamErr);
              if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Failed while streaming digital asset.' });
              }
            });
            return downloadResult.stream.pipe(res);
          } else if (downloadResult.buffer) {
            return res.send(downloadResult.buffer);
          }
        } catch (storageErr: any) {
          console.error('[STORAGE DOWNLOAD ERROR]:', storageErr.message);
          return res.status(503).json({
            success: false,
            message: 'Digital asset is temporarily undergoing verification. Please retry your download in a moment.',
            error: storageErr.message
          });
        }
      }

      // Fallback: If external primaryUrl exists
      if (product.digitalAsset?.primaryUrl && product.digitalAsset.primaryUrl.startsWith('http')) {
        return res.redirect(product.digitalAsset.primaryUrl);
      }

      res.status(404).json({ success: false, message: 'No downloadable asset file configured' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. My Purchases Lookup (Customer self-service portal - strictly isolated by customer session)
  app.post('/api/my-purchases', requireCustomerAuth, (req: AuthenticatedCustomerRequest, res) => {
    try {
      const customer = req.customer!;
      const { email } = req.body;
      const targetEmail = (email && typeof email === 'string' ? email.trim().toLowerCase() : customer.email.toLowerCase());

      // Strict security check: Authenticated customer can only query their own purchases
      if (targetEmail !== customer.email.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You can only view purchases associated with your authenticated account.'
        });
      }

      const orders = store.getOrdersByCustomer({ id: customer.id, email: customer.email });
      // Return paid, partially_refunded, and refunded orders to preserve customer order history
      const relevantOrders = orders.filter(o => o.status === 'paid' || o.status === 'partially_refunded' || o.status === 'refunded');

      res.json({
        success: true,
        orders: relevantOrders.map(o => {
          const hasAccess = o.status === 'paid' || o.status === 'partially_refunded';
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            productTitle: o.productTitle,
            productCover: o.productCover,
            productCategory: o.productCategory,
            amount: o.amount,
            currency: o.currency,
            paidAt: o.paidAt || o.createdAt,
            status: o.status,
            accessToken: hasAccess ? o.accessToken : undefined,
            accessUrl: hasAccess ? `/access/${o.accessToken}` : undefined,
            downloadUrl: hasAccess ? `/api/access/${o.accessToken}/download` : undefined,
            refundAmount: o.refundAmount,
            refundCurrency: o.refundCurrency,
            refundStatus: o.refundStatus,
            refundProcessedAt: o.refundProcessedAt,
            emailDeliveryStatus: o.emailDeliveryStatus || 'sent'
          };
        })
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9b. Live Order Status Check & Reconciliation Endpoint (For active checkout polling / verification fallback)
  const handleOrderStatusReconcile = (req: AuthenticatedCustomerRequest, res: express.Response) => {
    try {
      const customer = req.customer!;
      const { id } = req.params;

      const order = store.getOrderById(id) || store.getOrderByRazorpayOrderId(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Security check: Customer can only view their own order
      const isOwner = (order.customerId && order.customerId === customer.id) ||
                      (order.buyerEmail && order.buyerEmail.toLowerCase() === customer.email.toLowerCase());
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to access this order' });
      }

      res.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          amount: order.amount,
          currency: order.currency,
          productTitle: order.productTitle,
          productSlug: order.productSlug,
          paidAt: order.paidAt,
          accessToken: order.status === 'paid' ? order.accessToken : undefined,
          accessUrl: order.status === 'paid' ? `/access/${order.accessToken}` : undefined,
          emailDeliveryStatus: order.emailDeliveryStatus
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  app.get('/api/orders/:id/status', requireCustomerAuth, handleOrderStatusReconcile);
  app.get('/api/orders/:id/reconcile', requireCustomerAuth, handleOrderStatusReconcile);

  // 10. Analytics Event Tracking (Public click/visit log)
  const handleAnalyticsTrack = async (req: express.Request, res: express.Response) => {
    try {
      const { visitorId, productId, productSlug, articleId, articleSlug, type, source = 'direct', path = '/', amount } = req.body;
      if (!type) {
        return res.status(400).json({ success: false, message: 'Event type is required' });
      }

      const validTypes = ['visit', 'page_view', 'product_view', 'article_view', 'book_cta_click', 'buy_click', 'checkout_start', 'purchase', 'click'];
      const normalizedType = validTypes.includes(type) ? type : 'visit';

      const activeStore = getActiveStore();
      const event = await activeStore.logEvent({
        visitorId: visitorId ? String(visitorId).trim() : undefined,
        productId,
        productSlug,
        articleId,
        articleSlug,
        type: normalizedType,
        source: (source || 'direct').toLowerCase(),
        path: path || '/',
        amount: typeof amount === 'number' ? amount : undefined
      });

      res.json({ success: true, eventId: event.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  app.post('/api/analytics/event', handleAnalyticsTrack);
  app.post('/api/analytics/track', handleAnalyticsTrack);

  // ==========================================
  // CUSTOMER AUTHENTICATION & ACCOUNT API ROUTES
  // (Completely separate from Admin Authentication)
  // ==========================================

  // 1. Customer Registration
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, confirmPassword } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Please enter your full name (at least 2 characters).' });
      }

      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const activeStore = getActiveStore();
      const existing = await activeStore.getCustomerByEmail(normalizedEmail);
      if (existing) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists. Please sign in.' });
      }

      const passwordHash = await hashCustomerPassword(password);
      const customer = await activeStore.createCustomer(name.trim(), normalizedEmail, passwordHash);

      // Create secure customer session
      const session = createCustomerSession(customer.id, customer.email);

      // Asynchronously trigger welcome email (safe, non-blocking)
      const settings = await activeStore.getSettings();
      emailService.sendWelcomeEmail({
        customerName: customer.name,
        customerEmail: customer.email,
        storeName: settings.storeName,
        supportEmail: settings.supportEmail
      }).catch(err => {
        console.warn('[WELCOME EMAIL EXCEPTION (NON-BLOCKING)]', err);
      });

      res.status(201).json({
        success: true,
        token: session.token,
        user: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          role: 'customer' as const,
          createdAt: customer.createdAt
        },
        message: 'Account created successfully!'
      });
    } catch (err: any) {
      console.error('Customer registration error:', err);
      res.status(500).json({ success: false, message: err.message || 'Registration failed' });
    }
  });

  // 2. Customer Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const customer = await getActiveStore().getCustomerByEmail(normalizedEmail);

      if (!customer) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const isMatch = await verifyCustomerPassword(String(password), customer.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const session = createCustomerSession(customer.id, customer.email);

      res.json({
        success: true,
        token: session.token,
        user: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          role: 'customer' as const,
          createdAt: customer.createdAt
        },
        message: 'Logged in successfully.'
      });
    } catch (err: any) {
      console.error('Customer login error:', err);
      res.status(500).json({ success: false, message: err.message || 'Login failed' });
    }
  });

  // 3. Customer Session / Current User Profile Check
  app.get('/api/auth/me', requireCustomerAuth, (req: AuthenticatedCustomerRequest, res) => {
    try {
      res.json({
        success: true,
        user: req.customer
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4. Customer Logout
  app.post('/api/auth/logout', (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : (req.headers['x-customer-token'] as string);

      if (token) {
        revokeCustomerSession(token);
      }

      res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 5. Update Customer Profile (Name update only - strict role and id isolation)
  app.put('/api/account', requireCustomerAuth, async (req: AuthenticatedCustomerRequest, res) => {
    try {
      const customerId = req.customer!.id;
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Please enter a valid name (at least 2 characters).' });
      }

      const updated = await getActiveStore().updateCustomer(customerId, { name: name.trim() });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Customer account not found.' });
      }

      res.json({
        success: true,
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: 'customer' as const,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        },
        message: 'Profile updated successfully.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 6. Change Password (Requires current password verification)
  app.post('/api/auth/change-password', requireCustomerAuth, async (req: AuthenticatedCustomerRequest, res) => {
    try {
      const customerId = req.customer!.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'New passwords do not match.' });
      }

      const customer = await getActiveStore().getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer account not found.' });
      }

      const isCurrentValid = await verifyCustomerPassword(currentPassword, customer.passwordHash);
      if (!isCurrentValid) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }

      const newHash = await hashCustomerPassword(newPassword);
      await getActiveStore().updateCustomer(customerId, { passwordHash: newHash });

      res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 7. Authenticated Customer Purchases / Orders
  app.get('/api/customer/orders', requireCustomerAuth, async (req: AuthenticatedCustomerRequest, res) => {
    try {
      const customer = req.customer!;
      const orders = await getActiveStore().getOrdersByCustomer({ id: customer.id, email: customer.email });

      res.json({
        success: true,
        orders: orders.map(o => {
          const hasAccess = o.status === 'paid' || o.status === 'partially_refunded';
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            productId: o.productId,
            productSlug: o.productSlug,
            productTitle: o.productTitle,
            productCover: o.productCover,
            productCategory: o.productCategory,
            amount: o.amount,
            currency: o.currency,
            paidAt: o.paidAt || o.createdAt,
            status: o.status,
            accessToken: hasAccess ? o.accessToken : undefined,
            accessUrl: hasAccess ? `/access/${o.accessToken}` : undefined,
            downloadUrl: hasAccess ? `/api/access/${o.accessToken}/download` : undefined,
            refundAmount: o.refundAmount,
            refundCurrency: o.refundCurrency,
            refundStatus: o.refundStatus,
            refundProcessedAt: o.refundProcessedAt
          };
        })
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ==========================================
  // ADMIN AUTHENTICATION API ROUTES
  // ==========================================

  // Admin Login Endpoint (Authenticates credentials & creates server session)
  app.post('/api/admin/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      const result = authService.authenticate(email, password);

      if (!result.success || !result.session) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: result.error || 'Invalid credentials'
        });
      }

      res.json({
        success: true,
        token: result.session.token,
        user: result.session.user,
        expiresAt: result.session.expiresAt,
        message: 'Admin authentication successful'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Profile & Active Session Check (Protected by requireAdmin)
  app.get('/api/admin/auth/me', requireAdmin, (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
      res.json({ success: true, user: adminUser });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Logout Endpoint (Invalidates server session)
  app.post('/api/admin/auth/logout', requireAdmin, (req, res) => {
    try {
      let token: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (req.headers['x-admin-token']) {
        token = String(req.headers['x-admin-token']).trim();
      }

      if (token) {
        authService.destroySession(token);
      }

      res.json({ success: true, message: 'Administrator logged out successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // PROTECTED ADMIN API ROUTES (requireAdmin)
  // ==========================================

  // Admin Articles List (Includes published, draft, and archived)
  app.get('/api/admin/articles', requireAdmin, async (_req, res) => {
    try {
      const articles = await getActiveStore().getArticles(true);
      res.json({ success: true, articles });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/admin/articles/:id', requireAdmin, async (req, res) => {
    try {
      const article = await getActiveStore().getArticleById(req.params.id) || await getActiveStore().getArticleBySlug(req.params.id, true);
      if (!article) {
        return res.status(404).json({ success: false, message: 'Article not found' });
      }
      const relatedArticles = await getActiveStore().getRelatedArticles(article, 3);
      res.json({ success: true, article, relatedArticles });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  const handleSaveArticle = async (req: express.Request, res: express.Response) => {
    try {
      const articleData = req.body as Partial<Article>;
      if (!articleData.title || !String(articleData.title).trim()) {
        return res.status(400).json({ success: false, message: 'Article title is required' });
      }
      const saved = await getActiveStore().saveArticle(articleData);
      res.json({ success: true, article: saved });
    } catch (err: any) {
      const status = err.message?.toLowerCase().includes('duplicate') || err.message?.toLowerCase().includes('unique') ? 409 : 500;
      res.status(status).json({ success: false, error: err.message, message: err.message || 'Failed to save article' });
    }
  };

  app.post('/api/admin/articles', requireAdmin, handleSaveArticle);
  app.put('/api/admin/articles/:id', requireAdmin, async (req, res) => {
    req.body.id = req.params.id;
    return handleSaveArticle(req, res);
  });

  app.post('/api/admin/articles/:id/publish', requireAdmin, async (req, res) => {
    try {
      const result = await getActiveStore().publishArticle(req.params.id);
      if (!result.success) return res.status(404).json(result);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/articles/:id/unpublish', requireAdmin, async (req, res) => {
    try {
      const result = await getActiveStore().unpublishArticle(req.params.id);
      if (!result.success) return res.status(404).json(result);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/articles/:id/archive', requireAdmin, async (req, res) => {
    try {
      const result = await getActiveStore().archiveArticle(req.params.id);
      if (!result.success) return res.status(404).json(result);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/admin/articles/:id', requireAdmin, async (req, res) => {
    try {
      const result = await getActiveStore().deleteArticle(req.params.id);
      if (!result.success) return res.status(404).json(result);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Products List (Includes all products, published & drafts)
  app.get('/api/admin/products', requireAdmin, (req, res) => {
    try {
      const allProducts = store.getProducts();
      res.json({ success: true, products: allProducts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Upload Cover Image (Admin only)
  app.post('/api/admin/upload/cover', requireAdmin, upload.single('coverImage'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided' });
      }

      const validation = FileStorageService.validateCoverImage(req.file);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }

      const result = FileStorageService.saveCoverImage(req.file);
      res.json({
        success: true,
        url: result.url,
        fileName: result.fileName,
        message: 'Cover image uploaded successfully'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to upload cover image' });
    }
  });

  // Upload Private Digital Product File (Admin only - stored in secure private directory or object storage)
  app.post('/api/admin/upload/product-file', requireAdmin, upload.single('productFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No digital product file provided' });
      }

      const validation = FileStorageService.validateProductFile(req.file);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }

      const stored = await FileStorageService.savePrivateProductFile(req.file, req.body.productId);
      res.json({
        success: true,
        metadata: stored.metadata,
        message: 'Digital asset uploaded securely to private vault storage'
      });
    } catch (err: any) {
      console.error('[UPLOAD ERROR]:', err);
      const isConfigError = err.message?.includes('PRIVATE STORAGE NOT CONFIGURED');
      res.status(isConfigError ? 503 : 500).json({
        success: false,
        error: err.message || 'Failed to upload product file'
      });
    }
  });

  // Create Product (Admin only)
  app.post('/api/products', requireAdmin, (req, res) => {
    try {
      const productData = req.body as Product;
      if (!productData.title || !productData.priceINR) {
        return res.status(400).json({ success: false, message: 'Title and Price are required' });
      }
      if (!productData.slug) {
        productData.slug = productData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      const saved = store.saveProduct(productData);
      res.json({ success: true, product: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update Product (Admin only)
  const handleUpdateProduct = (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const productData = { ...req.body, id } as Product;
      const saved = store.saveProduct(productData);
      res.json({ success: true, product: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  app.put('/api/products/:id', requireAdmin, handleUpdateProduct);
  app.put('/api/admin/products/:id', requireAdmin, handleUpdateProduct);

  // Archive Product (Admin only - sets status to archived / unpublishes from catalog while keeping customer access)
  const handleArchiveProduct = (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const result = store.archiveProduct(id);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  app.post('/api/products/:id/archive', requireAdmin, handleArchiveProduct);
  app.post('/api/admin/products/:id/archive', requireAdmin, handleArchiveProduct);

  // Unpublish Product (Admin only - sets status to draft)
  const handleUnpublishProduct = (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const result = store.unpublishProduct(id);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  app.post('/api/products/:id/unpublish', requireAdmin, handleUnpublishProduct);
  app.post('/api/admin/products/:id/unpublish', requireAdmin, handleUnpublishProduct);

  // Publish Product (Admin only - sets status to published)
  const handlePublishProduct = (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const result = store.publishProduct(id);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  app.post('/api/products/:id/publish', requireAdmin, handlePublishProduct);
  app.post('/api/admin/products/:id/publish', requireAdmin, handlePublishProduct);

  // Delete Product (Admin only - blocked if paid customer purchases exist)
  const handleDeleteProduct = (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const result = store.deleteProduct(id);
      if (!result.success) {
        return res.status(result.prevented ? 409 : 404).json({
          success: false,
          prevented: result.prevented,
          message: result.message || 'Product deletion failed'
        });
      }
      res.json({ success: true, message: result.message || 'Product deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  app.delete('/api/products/:id', requireAdmin, handleDeleteProduct);
  app.delete('/api/admin/products/:id', requireAdmin, handleDeleteProduct);

  // Reset Catalog to Defaults (Admin only)
  app.post('/api/admin/reset-catalog', requireAdmin, (req, res) => {
    try {
      const products = store.resetCatalogToDefaults();
      res.json({ success: true, products });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin All Products Catalog (includes drafts and archived)
  app.get('/api/admin/products', requireAdmin, (req, res) => {
    try {
      const products = store.getProducts();
      res.json({ success: true, products });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Analytics Detailed Summary (Admin only)
  const handleAnalyticsSummary = (req: express.Request, res: express.Response) => {
    try {
      const { range = '7d', start, end } = req.query;
      const summary = store.getAnalyticsSummary(range as any, start as string, end as string);
      res.json({ success: true, summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  app.get('/api/analytics/summary', requireAdmin, handleAnalyticsSummary);
  app.get('/api/admin/analytics/summary', requireAdmin, handleAnalyticsSummary);

  // Analytics Stats & KPIs (Admin only)
  const handleAnalyticsStats = (req: express.Request, res: express.Response) => {
    try {
      const { range = '7d', start, end } = req.query;
      const stats = store.getDashboardStats();
      const summary = store.getAnalyticsSummary(range as any, start as string, end as string);
      res.json({ success: true, stats, summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  app.get('/api/analytics/stats', requireAdmin, handleAnalyticsStats);
  app.get('/api/admin/analytics/stats', requireAdmin, handleAnalyticsStats);

  // Admin Orders CRM List (Admin only)
  app.get('/api/admin/orders', requireAdmin, (req, res) => {
    try {
      const orders = store.getOrders();
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Customers CRM List (Admin only - sanitized with zero secrets)
  app.get('/api/admin/customers', requireAdmin, (req, res) => {
    try {
      const customers = store.getCustomers();
      const orders = store.getOrders();

      const customerList = customers.map(c => {
        const cNormalizedEmail = c.email.trim().toLowerCase();
        const cOrders = orders.filter(o => 
          (Boolean(o.customerId) && o.customerId === c.id) ||
          (Boolean(o.buyerEmail) && o.buyerEmail.trim().toLowerCase() === cNormalizedEmail)
        );

        const completedOrders = cOrders.filter(o => o.status === 'paid' || o.status === 'partially_refunded' || o.status === 'refunded');
        const grossSpentINR = completedOrders.reduce((sum, o) => {
          const amt = o.currency === 'USD' ? Math.round(o.amount * 85) : o.amount;
          return sum + amt;
        }, 0);

        const refundedINR = completedOrders.reduce((sum, o) => {
          if (o.status === 'refunded') {
            const raw = o.refundAmount !== undefined ? o.refundAmount : o.amount;
            return sum + (o.currency === 'USD' ? Math.round(raw * 85) : raw);
          }
          if (o.status === 'partially_refunded') {
            const raw = o.refundAmount || 0;
            return sum + (o.currency === 'USD' ? Math.round(raw * 85) : raw);
          }
          return sum;
        }, 0);

        const totalSpentINR = Math.max(0, grossSpentINR - refundedINR);
        const activePurchases = cOrders.filter(o => o.status === 'paid' || o.status === 'partially_refunded');

        const purchasedProducts = completedOrders.map(o => ({
          productId: o.productId,
          productSlug: o.productSlug,
          productTitle: o.productTitle,
          productCategory: o.productCategory,
          orderId: o.id,
          orderNumber: o.orderNumber,
          amountINR: o.currency === 'USD' ? Math.round(o.amount * 85) : o.amount,
          refundAmountINR: o.refundAmount,
          purchaseDate: o.paidAt || o.createdAt,
          status: o.status,
          accessToken: (o.status === 'paid' || o.status === 'partially_refunded') ? o.accessToken : undefined
        }));

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          purchasesCount: activePurchases.length,
          grossSpentINR,
          refundedINR,
          totalSpentINR,
          purchasedProducts
        };
      });

      res.json({ success: true, customers: customerList });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Single Customer Details (Admin only)
  app.get('/api/admin/customers/:id', requireAdmin, (req, res) => {
    try {
      const { id } = req.params;
      const c = store.getCustomerById(id);
      if (!c) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const orders = store.getOrders();
      const cNormalizedEmail = c.email.trim().toLowerCase();
      const cOrders = orders.filter(o => 
        (Boolean(o.customerId) && o.customerId === c.id) ||
        (Boolean(o.buyerEmail) && o.buyerEmail.trim().toLowerCase() === cNormalizedEmail)
      );

      const completedOrders = cOrders.filter(o => o.status === 'paid' || o.status === 'partially_refunded' || o.status === 'refunded');
      const grossSpentINR = completedOrders.reduce((sum, o) => {
        const amt = o.currency === 'USD' ? Math.round(o.amount * 85) : o.amount;
        return sum + amt;
      }, 0);

      const refundedINR = completedOrders.reduce((sum, o) => {
        if (o.status === 'refunded') {
          const raw = o.refundAmount !== undefined ? o.refundAmount : o.amount;
          return sum + (o.currency === 'USD' ? Math.round(raw * 85) : raw);
        }
        if (o.status === 'partially_refunded') {
          const raw = o.refundAmount || 0;
          return sum + (o.currency === 'USD' ? Math.round(raw * 85) : raw);
        }
        return sum;
      }, 0);

      const totalSpentINR = Math.max(0, grossSpentINR - refundedINR);
      const activePurchases = cOrders.filter(o => o.status === 'paid' || o.status === 'partially_refunded');

      const purchasedProducts = completedOrders.map(o => ({
        productId: o.productId,
        productSlug: o.productSlug,
        productTitle: o.productTitle,
        productCategory: o.productCategory,
        orderId: o.id,
        orderNumber: o.orderNumber,
        amountINR: o.currency === 'USD' ? Math.round(o.amount * 85) : o.amount,
        refundAmountINR: o.refundAmount,
        purchaseDate: o.paidAt || o.createdAt,
        status: o.status,
        accessToken: (o.status === 'paid' || o.status === 'partially_refunded') ? o.accessToken : undefined
      }));

      res.json({
        success: true,
        customer: {
          id: c.id,
          name: c.name,
          email: c.email,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          purchasesCount: activePurchases.length,
          grossSpentINR,
          refundedINR,
          totalSpentINR,
          purchasedProducts,
          allOrders: cOrders.map(o => ({
            id: o.id,
            orderNumber: o.orderNumber,
            productTitle: o.productTitle,
            amount: o.amount,
            currency: o.currency,
            status: o.status,
            refundAmount: o.refundAmount,
            refundStatus: o.refundStatus,
            createdAt: o.createdAt,
            paidAt: o.paidAt
          }))
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update Order Status / Refund (Admin only)
  app.post('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
    try {
      const { id } = req.params;
      const { status, refundAmount, refundNotes } = req.body;
      const validStatuses: OrderStatus[] = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status provided' });
      }

      const existingOrder = store.getOrderById(id) || store.getOrderByRazorpayOrderId(id);
      if (!existingOrder) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const details: Partial<Order> = {};
      if (status === 'refunded' || status === 'partially_refunded') {
        details.refundStatus = 'processed';
        details.refundProcessedAt = new Date().toISOString();
        if (refundAmount !== undefined && !isNaN(Number(refundAmount))) {
          details.refundAmount = Number(refundAmount);
        } else if (status === 'refunded') {
          details.refundAmount = existingOrder.amount;
        }
        if (refundNotes) {
          details.refundNotes = typeof refundNotes === 'object' ? refundNotes : { note: refundNotes };
        }
      }

      const updated = store.updateOrderStatus(id, status, details);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      res.json({ success: true, order: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Resend Email Receipt (Admin only)
  app.post('/api/admin/orders/:id/resend-email', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const order = store.getOrderById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.status !== 'paid') {
        return res.status(400).json({ success: false, message: 'Cannot send confirmation email for unpaid or cancelled orders.' });
      }

      const product = store.getProductById(order.productId) || store.getProductBySlug(order.productSlug);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product record for this order could not be located.' });
      }

      const settings = store.getSettings();
      const delivery = await emailService.sendOrderFulfillmentEmail({
        order,
        product,
        accessUrl: `/access/${order.accessToken}`,
        supportEmail: settings.supportEmail || 'support@ngalungatelier.com',
        storeName: settings.storeName || 'The Ngalung Atelier',
        licenseKey: product.digitalAsset?.licenseKey
      });

      store.recordEmailDelivery(order.id, delivery.status, delivery.error);

      res.json({
        success: delivery.sent,
        message: delivery.sent
          ? `Receipt and secure access link successfully sent to ${order.buyerEmail}`
          : `Failed to deliver email: ${delivery.error || 'Provider rejected request'}.`,
        deliveryStatus: delivery.status,
        timestamp: delivery.timestamp
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete Order Record (Admin only)
  app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
    try {
      const { id } = req.params;
      const success = store.deleteOrder(id);
      if (!success) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      res.json({ success: true, message: 'Order record deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Store Settings (Admin only)
  app.get('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const settings = store.getSettings();
      const gatewayStatus = razorpayService.getGatewayStatus();
      const emailStatus = emailService.getStatus();
      const dbStatus = await getDatabaseStatus();
      const storageStatus = await storageService.getStatus();
      const safeSettings = {
        ...settings,
        paymentGateway: gatewayStatus,
        emailService: emailStatus,
        database: dbStatus,
        storage: storageStatus,
        razorpayKeySecret: settings.razorpayKeySecret ? '••••••••••••••••' : ''
      };
      res.json({
        success: true,
        settings: safeSettings,
        gateway: gatewayStatus,
        emailService: emailStatus,
        database: dbStatus,
        storage: storageStatus
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update Admin Store Settings (Admin only)
  app.post('/api/admin/settings', requireAdmin, (req, res) => {
    try {
      const updated = store.updateSettings(req.body as Partial<StoreSettings>);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // VITE & STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (serveStatic) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Database Initialization & Startup Verification
  if (runStartupChecks && isPostgresConfigured()) {
    console.log('[DATABASE] PostgreSQL connection string detected (DATABASE_URL). Checking connection...');
    checkDatabaseConnection().then(async (status) => {
      if (status.status === 'CONNECTED') {
        console.log('[DATABASE] ✓ PostgreSQL connected successfully. Verifying schema migrations...');
        try {
          const migRes = await runMigrations();
          console.log(`[DATABASE] ${migRes.message}`);
        } catch (mErr: any) {
          console.error('[DATABASE] Migration warning:', mErr.message);
        }
      } else {
        console.warn(`[DATABASE WARNING] PostgreSQL connection check: ${status.status} (${status.error || 'Unknown error'})`);
      }
    }).catch(err => {
      console.error('[DATABASE ERROR]:', err.message);
    });
  } else if (runStartupChecks) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[DATABASE WARNING] DATABASE_URL is not set in production. Local JSON datastore fallback active.');
    } else {
      console.log('[DATASTORE] Running in development mode with local JSON datastore (data/db.json).');
    }
  }

  return app;
}

export async function startServer() {
  const app = await createApp({ serveStatic: true, runStartupChecks: true });
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.listen(PORT, '0.0.0.0', () => {
    // Object Storage Initialization & Verification
    storageService.getStatus().then(status => {
      console.log(`[STORAGE] Active Provider: ${status.provider} (Status: ${status.status}, Bucket: ${status.bucket || 'local-vault'})`);
      if (status.status === 'ERROR') {
        console.warn(`[STORAGE WARNING] Object storage connectivity issue: ${status.error}`);
      }
    }).catch(err => {
      console.error('[STORAGE DIAGNOSTIC ERROR]:', err.message);
    });

    console.log(`Digital Product Sales Server listening at http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
  });
}
