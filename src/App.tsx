import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CustomerWelcome } from './components/CustomerWelcome';
import { StorefrontHome } from './components/StorefrontHome';
import { ProductLandingPage } from './components/ProductLandingPage';
import { ArticleLibraryPage } from './components/ArticleLibraryPage';
import { ArticlePage } from './components/ArticlePage';
import { CustomerArticlesPage } from './components/CustomerArticlesPage';
import { CheckoutModal } from './components/CheckoutModal';
import { DeliveryVault } from './components/DeliveryVault';
import { MyPurchases } from './components/MyPurchases';
import { CustomerLogin } from './components/CustomerLogin';
import { CustomerRegister } from './components/CustomerRegister';
import { CustomerAccount } from './components/CustomerAccount';
import { AdminDashboard } from './components/AdminDashboard';
import { TermsPage } from './components/legal/TermsPage';
import { PrivacyPage } from './components/legal/PrivacyPage';
import { RefundPolicyPage } from './components/legal/RefundPolicyPage';
import { ContactPage } from './components/legal/ContactPage';
import { Product, PublicStoreInfo, CustomerUser, CustomerOrder } from './types';
import { fetchProducts, fetchPublicStoreInfo, checkCustomerAuth, checkAdminAuth, logoutCustomer, fetchCustomerOrders } from './lib/api';
import { analytics } from './lib/analytics';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [utmSource, setUtmSource] = useState<string>('direct');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [storeInfo, setStoreInfo] = useState<PublicStoreInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Customer Authentication state
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Active Checkout Product Modal
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);

  // Initialize and parse URL & Customer Session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const src = params.get('src') || params.get('utm_source') || 'direct';
    setUtmSource(src);

    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      const updatedParams = new URLSearchParams(window.location.search);
      const updatedSrc = updatedParams.get('src') || updatedParams.get('utm_source') || 'direct';
      setUtmSource(updatedSrc);
    };

    window.addEventListener('popstate', handleLocationChange);

    // Initial public data fetch and customer authentication check
    async function initData() {
      try {
        const [prods, publicInfo, customer] = await Promise.all([
          fetchProducts(false).catch(() => []),
          fetchPublicStoreInfo().catch(() => null),
          checkCustomerAuth().catch(() => null)
        ]);

        setProducts(prods || []);
        if (publicInfo) {
          setStoreInfo(publicInfo);
        }
        if (customer) {
          setCustomerUser(customer);
          fetchCustomerOrders()
            .then(orders => setCustomerOrders(orders || []))
            .catch(() => {});
        }
      } catch (err) {
        console.error('Failed to initialize app data:', err);
      } finally {
        setLoading(false);
        setAuthChecking(false);
      }
    }
    initData();

    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Track page views and product views
  useEffect(() => {
    if (!currentPath.startsWith('/admin')) {
      analytics.trackPageView(currentPath);
      if (currentPath.startsWith('/p/')) {
        const slug = currentPath.replace('/p/', '').split('/')[0];
        const matched = products.find(p => p.slug === slug || p.id === slug);
        if (matched) {
          analytics.trackProductView(matched.id, matched.slug);
        }
      }
    }
  }, [currentPath, products]);

  // Router navigation helper
  const navigate = (view: string, slug?: string) => {
    if (view === 'products') {
      if (!customerUser) {
        navigate('login');
        return;
      }
      if (currentPath === '/' || currentPath === '') {
        const el = document.getElementById('products-catalog');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
      setTimeout(() => {
        const el = document.getElementById('products-catalog');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return;
    }

    if (view === 'about') {
      if (!customerUser) {
        navigate('login');
        return;
      }
      if (currentPath === '/' || currentPath === '') {
        const el = document.getElementById('about-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
      setTimeout(() => {
        const el = document.getElementById('about-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return;
    }

    let newPath = '/';
    if (view === 'articles') {
      newPath = '/articles';
    } else if (view === 'write-article') {
      newPath = '/articles/write';
    } else if (view === 'my-articles') {
      newPath = '/account/articles';
    } else if (view === 'article' && slug) {
      newPath = `/articles/${slug}`;
    } else if (view === 'product' && slug) {
      newPath = `/p/${slug}`;
    } else if (view === 'access' && slug) {
      newPath = `/access/${slug}`;
    } else if (view === 'purchases' || view === 'my-purchases') {
      newPath = '/purchases';
    } else if (view === 'login') {
      newPath = '/login';
    } else if (view === 'register') {
      newPath = '/register';
    } else if (view === 'account') {
      newPath = '/account';
    } else if (view === 'admin') {
      newPath = '/admin';
    } else if (view === 'admin-articles') {
      newPath = '/admin/articles';
    } else if (view === 'admin-write-article') {
      newPath = '/admin/articles/write';
    } else if (view === 'terms') {
      newPath = '/terms';
    } else if (view === 'privacy') {
      newPath = '/privacy';
    } else if (view === 'refund-policy' || view === 'refund') {
      newPath = '/refund-policy';
    } else if (view === 'contact') {
      newPath = '/contact';
    } else {
      newPath = '/';
    }

    window.history.pushState({}, '', newPath);
    setCurrentPath(newPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine current active view from pathname and customer auth state
  let activeView = 'home';
  let activeSlug: string | null = null;
  let activeAccessToken: string | null = null;

  if (currentPath.startsWith('/p/')) {
    activeView = 'product';
    activeSlug = currentPath.replace('/p/', '').split('?')[0];
  } else if (currentPath === '/articles') {
    activeView = 'articles';
  } else if (currentPath === '/articles/write') {
    activeView = 'write-article';
  } else if (currentPath === '/account/articles') {
    activeView = 'my-articles';
  } else if (currentPath.startsWith('/articles/')) {
    activeView = 'article';
    activeSlug = currentPath.replace('/articles/', '').split('?')[0];
  } else if (currentPath.startsWith('/access/')) {
    activeView = 'access';
    activeAccessToken = currentPath.replace('/access/', '').split('?')[0];
  } else if (currentPath === '/purchases' || currentPath === '/my-purchases') {
    activeView = 'purchases';
  } else if (currentPath === '/login') {
    activeView = 'login';
  } else if (currentPath === '/register') {
    activeView = 'register';
  } else if (currentPath === '/account') {
    activeView = 'account';
  } else if (currentPath === '/admin' || currentPath.startsWith('/admin/')) {
    activeView = 'admin';
  } else if (currentPath === '/terms') {
    activeView = 'terms';
  } else if (currentPath === '/privacy') {
    activeView = 'privacy';
  } else if (currentPath === '/refund-policy' || currentPath === '/refund') {
    activeView = 'refund-policy';
  } else if (currentPath === '/contact') {
    activeView = 'contact';
  } else {
    // Root path '/'
    activeView = customerUser ? 'home' : 'welcome';
  }

  const selectedProduct = activeSlug
    ? products.find(p => p.slug === activeSlug || p.id === activeSlug)
    : null;

  // Determine if authenticated customer owns the currently selected product
  const matchingOrder = selectedProduct && customerOrders.length > 0
    ? customerOrders.find(
        o => (o.productId === selectedProduct.id || o.productSlug === selectedProduct.slug) && o.status === 'paid'
      )
    : null;
  const isProductOwned = Boolean(matchingOrder);
  const ownedAccessToken = matchingOrder?.accessToken;

  const handleCheckoutSuccess = (accessToken: string) => {
    setCheckoutProduct(null);
    if (customerUser) {
      fetchCustomerOrders()
        .then(orders => setCustomerOrders(orders || []))
        .catch(() => {});
    }
    navigate('access', accessToken);
  };

  const handleCustomerLoginSuccess = (user: CustomerUser) => {
    setCustomerUser(user);
    fetchCustomerOrders()
      .then(orders => setCustomerOrders(orders || []))
      .catch(() => {});
    navigate('home'); // Enter main storefront
  };

  const handleCustomerRegisterSuccess = (user: CustomerUser) => {
    setCustomerUser(user);
    fetchCustomerOrders()
      .then(orders => setCustomerOrders(orders || []))
      .catch(() => {});
    navigate('home'); // Enter main storefront
  };

  const handleCustomerLogout = async () => {
    try {
      await logoutCustomer();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCustomerUser(null);
    setCustomerOrders([]);
    navigate('home'); // Return to Welcome screen on '/'
  };

  const handleWriteArticleNavigation = async () => {
    const adminUser = await checkAdminAuth().catch(() => null);
    navigate(adminUser ? 'admin-write-article' : 'write-article');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF6EE] text-[#17181F] font-sans antialiased selection:bg-[#FF5A36] selection:text-white">
      {/* Universal Header (Shows Home, Products, About, My Purchases, Customer Account / Sign In - NO Admin link) */}
      <Header
        settings={storeInfo}
        currentView={activeView}
        currency={currency}
        onCurrencyChange={setCurrency}
        onNavigate={navigate}
        selectedSlug={activeSlug}
        customerUser={customerUser}
        onLogout={handleCustomerLogout}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {loading || authChecking ? (
          <div className="flex min-h-[65vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E7DFCE] border-t-[#FF5A36]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6E6C63]">
                Loading...
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Welcome / Customer Authentication Gate Screen (First screen for unauthenticated visitors) */}
            {activeView === 'welcome' && (
              <CustomerWelcome
                settings={storeInfo}
                onNavigateLogin={() => navigate('login')}
                onNavigateRegister={() => navigate('register')}
                onNavigateAdmin={() => navigate('admin')}
              />
            )}

            {/* 2. Public Storefront Home & Catalog (Visible once authenticated) */}
            {activeView === 'home' && (
              customerUser ? (
                <StorefrontHome
                  products={products}
                  currency={currency}
                  settings={storeInfo}
                  onSelectProduct={slug => navigate('product', slug)}
                  onBuyProduct={product => {
                    analytics.trackBuyClick(product.id, product.slug, product.priceINR);
                    setCheckoutProduct(product);
                  }}
                />
              ) : (
                <CustomerWelcome
                  settings={storeInfo}
                  onNavigateLogin={() => navigate('login')}
                  onNavigateRegister={() => navigate('register')}
                  onNavigateAdmin={() => navigate('admin')}
                />
              )
            )}

            {activeView === 'articles' && (
              <ArticleLibraryPage
                onSelectArticle={slug => navigate('article', slug)}
                onWriteArticle={handleWriteArticleNavigation}
              />
            )}

            {activeView === 'article' && activeSlug && (
              <ArticlePage
                slug={activeSlug}
                onNavigateHome={() => navigate('home')}
                onNavigateArticles={() => navigate('articles')}
                onSelectArticle={slug => navigate('article', slug)}
              />
            )}

            {(activeView === 'write-article' || activeView === 'my-articles') && (
              customerUser ? (
                <CustomerArticlesPage
                  customerUser={customerUser}
                  mode={activeView === 'write-article' ? 'write' : 'list'}
                  onNavigateArticles={() => navigate('articles')}
                />
              ) : (
                <CustomerLogin
                  onLoginSuccess={handleCustomerLoginSuccess}
                  onNavigateRegister={() => navigate('register')}
                  onNavigateHome={() => navigate('home')}
                  redirectReason="Please sign in to write articles and submit them for review."
                />
              )
            )}

            {/* 3. Dedicated Product Landing & Sales Page (Protected by Customer Auth) */}
            {activeView === 'product' && selectedProduct && (
              customerUser ? (
                <ProductLandingPage
                  product={selectedProduct}
                  currency={currency}
                  settings={storeInfo as any}
                  utmSource={utmSource}
                  isOwned={isProductOwned}
                  ownedAccessToken={ownedAccessToken}
                  onOpenVault={token => navigate('access', token)}
                  onBuyNow={product => {
                    analytics.trackBuyClick(product.id, product.slug, product.priceINR);
                    setCheckoutProduct(product);
                  }}
                  onNavigateHome={() => navigate('home')}
                />
              ) : (
                <CustomerLogin
                  onLoginSuccess={handleCustomerLoginSuccess}
                  onNavigateRegister={() => navigate('register')}
                  onNavigateHome={() => navigate('home')}
                  redirectReason="Please sign in or create an account to view and purchase this digital system."
                />
              )
            )}

            {/* 3b. Product Not Found Fallback */}
            {activeView === 'product' && !selectedProduct && (
              <div className="mx-auto max-w-xl py-20 px-4 text-center space-y-4">
                <h2 className="font-display text-xl font-bold text-[#17181F]">System Not Found</h2>
                <p className="text-xs text-[#6E6C63]">The digital product you are looking for might have been unlisted or moved.</p>
                <button
                  onClick={() => navigate('home')}
                  className="rounded-full bg-[#17181F] px-6 py-2.5 text-xs font-bold text-[#FAF6EE] hover:bg-[#31333F] transition-colors cursor-pointer"
                >
                  Return to Storefront
                </button>
              </div>
            )}

            {/* 4. Protected Gated Delivery Vault (Server-Side Verified by token) */}
            {activeView === 'access' && activeAccessToken && (
              <DeliveryVault
                accessToken={activeAccessToken}
                onNavigateHome={() => navigate('home')}
                onNavigateToProduct={slug => navigate('product', slug)}
              />
            )}

            {/* 5. Customer My Purchases Lookup Portal */}
            {activeView === 'purchases' && (
              customerUser ? (
                <MyPurchases
                  customerUser={customerUser}
                  onAccessVault={token => navigate('access', token)}
                  onNavigateHome={() => navigate('home')}
                  onNavigateLogin={() => navigate('login')}
                  onNavigateRegister={() => navigate('register')}
                />
              ) : (
                <CustomerLogin
                  onLoginSuccess={handleCustomerLoginSuccess}
                  onNavigateRegister={() => navigate('register')}
                  onNavigateHome={() => navigate('home')}
                  redirectReason="Please sign in to view your purchased digital systems and active vaults."
                />
              )
            )}

            {/* 6. Customer Login Page */}
            {activeView === 'login' && (
              <CustomerLogin
                onLoginSuccess={handleCustomerLoginSuccess}
                onNavigateRegister={() => navigate('register')}
                onNavigateHome={() => navigate('home')}
              />
            )}

            {/* 7. Customer Register Page */}
            {activeView === 'register' && (
              <CustomerRegister
                onRegisterSuccess={handleCustomerRegisterSuccess}
                onNavigateLogin={() => navigate('login')}
                onNavigateHome={() => navigate('home')}
              />
            )}

            {/* 8. Customer Account Dashboard (Protected for Customer) */}
            {activeView === 'account' && (
              customerUser ? (
                <CustomerAccount
                  user={customerUser}
                  onUpdateUser={updated => setCustomerUser(updated)}
                  onLogout={handleCustomerLogout}
                  onNavigatePurchases={() => navigate('purchases')}
                  onNavigateHome={() => navigate('home')}
                />
              ) : (
                <CustomerLogin
                  onLoginSuccess={handleCustomerLoginSuccess}
                  onNavigateRegister={() => navigate('register')}
                  onNavigateHome={() => navigate('home')}
                  redirectReason="Please sign in to view and manage your customer account."
                />
              )
            )}

            {/* 9. Protected Administrator Dashboard & Auth Gate (Completely Independent from Customer Auth) */}
            {activeView === 'admin' && (
              <AdminDashboard
                onNavigateHome={() => navigate('home')}
                onPreviewProduct={slug => navigate('product', slug)}
                onPreviewArticle={slug => navigate('article', slug)}
                initialTab={currentPath.startsWith('/admin/articles') ? 'articles' : undefined}
                initialWriteArticle={currentPath.startsWith('/admin/articles/write')}
              />
            )}

            {/* 10. Legal & Compliance Pages */}
            {activeView === 'terms' && (
              <TermsPage
                storeInfo={storeInfo}
                onNavigate={navigate}
              />
            )}

            {activeView === 'privacy' && (
              <PrivacyPage
                storeInfo={storeInfo}
                onNavigate={navigate}
              />
            )}

            {activeView === 'refund-policy' && (
              <RefundPolicyPage
                storeInfo={storeInfo}
                onNavigate={navigate}
              />
            )}

            {/* 11. Customer Contact & Support Portal */}
            {activeView === 'contact' && (
              <ContactPage
                storeInfo={storeInfo}
                customerUser={customerUser}
                onNavigate={navigate}
              />
            )}
          </>
        )}
      </main>

      {/* Universal Footer */}
      <Footer settings={storeInfo} onNavigate={navigate} />

      {/* Checkout Modal */}
      {checkoutProduct && (
        <CheckoutModal
          product={checkoutProduct}
          currency={currency}
          settings={storeInfo as any}
          utmSource={utmSource}
          customerUser={customerUser}
          onClose={() => setCheckoutProduct(null)}
          onSuccess={handleCheckoutSuccess}
          onNavigatePurchases={() => navigate('purchases')}
        />
      )}
    </div>
  );
}
