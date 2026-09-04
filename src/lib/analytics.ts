import { AnalyticsEventType } from '../types';

const VISITOR_STORAGE_KEY = 'ngalung_visitor_id';

/**
 * Retrieves or generates an anonymous unique visitor ID
 */
export function getOrCreateVisitorId(): string {
  try {
    let visitorId = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!visitorId || !visitorId.startsWith('vis_')) {
      const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
      visitorId = `vis_${randomHex}`;
      localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
    }
    return visitorId;
  } catch {
    return 'vis_anon_' + Math.random().toString(36).substring(2, 8);
  }
}

/**
 * Extracts UTM source or referrer
 */
export function getTrafficSource(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source') || params.get('source') || params.get('ref');
    if (utmSource) return utmSource.toLowerCase().trim();

    if (document.referrer) {
      const refUrl = new URL(document.referrer);
      if (refUrl.hostname.includes('google')) return 'google';
      if (refUrl.hostname.includes('instagram')) return 'instagram';
      if (refUrl.hostname.includes('twitter') || refUrl.hostname.includes('x.com')) return 'twitter';
      if (refUrl.hostname.includes('linkedin')) return 'linkedin';
      if (refUrl.hostname.includes('youtube')) return 'youtube';
      if (refUrl.hostname.includes('facebook')) return 'facebook';
      if (refUrl.hostname !== window.location.hostname) return refUrl.hostname.replace('www.', '');
    }
    return 'direct';
  } catch {
    return 'direct';
  }
}

interface TrackPayload {
  type: AnalyticsEventType;
  path?: string;
  source?: string;
  productId?: string;
  productSlug?: string;
  amount?: number;
}

/**
 * Asynchronously sends an event to the analytics collector without blocking UI
 */
export function trackEvent(payload: TrackPayload): void {
  // Never log analytics when viewing admin dashboard or performing admin actions
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return;
  }

  const visitorId = getOrCreateVisitorId();
  const source = payload.source || getTrafficSource();
  const path = payload.path || (typeof window !== 'undefined' ? window.location.pathname : '/');

  const body = {
    visitorId,
    type: payload.type,
    source,
    path,
    productId: payload.productId,
    productSlug: payload.productSlug,
    amount: payload.amount
  };

  try {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      keepalive: true
    }).catch(() => {
      // Silently catch network errors
    });
  } catch {
    // Silently ignore tracking errors
  }
}

export const analytics = {
  trackPageView: (path?: string) => {
    trackEvent({ type: 'page_view', path });
  },
  trackProductView: (productId: string, productSlug: string) => {
    trackEvent({
      type: 'product_view',
      productId,
      productSlug,
      path: `/p/${productSlug}`
    });
  },
  trackBuyClick: (productId: string, productSlug: string, amount?: number) => {
    trackEvent({
      type: 'buy_click',
      productId,
      productSlug,
      amount,
      path: `/p/${productSlug}`
    });
  },
  trackCheckoutStart: (productId: string, productSlug: string, amount?: number) => {
    trackEvent({
      type: 'checkout_start',
      productId,
      productSlug,
      amount
    });
  },
  trackPurchase: (productId: string, productSlug: string, amount: number) => {
    trackEvent({
      type: 'purchase',
      productId,
      productSlug,
      amount
    });
  }
};
