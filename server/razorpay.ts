import crypto from 'crypto';
import Razorpay from 'razorpay';

// Read Razorpay credentials securely from server-side environment variables
const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || '').trim();
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || '').trim();
const RAZORPAY_WEBHOOK_SECRET = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
const RAZORPAY_CURRENCY = (process.env.RAZORPAY_CURRENCY || 'INR').trim().toUpperCase();

let razorpayInstance: Razorpay | null = null;

function getRazorpayClient(): Razorpay | null {
  if (razorpayInstance) return razorpayInstance;
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    try {
      razorpayInstance = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET
      });
      return razorpayInstance;
    } catch (err) {
      console.error('[RAZORPAY] Initialization error:', err);
      return null;
    }
  }
  return null;
}

export interface CreateOrderParams {
  amount: number; // in normal currency units (e.g. ₹999 or $19)
  currency: 'INR' | 'USD';
  receipt: string; // internal order number
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  razorpayOrderId: string;
  amountInSubunits: number; // in paise / cents (e.g. 99900)
  currency: 'INR' | 'USD';
}

export const razorpayService = {
  /**
   * Get Webhook Secret dynamically from environment
   */
  getWebhookSecret(): string {
    return (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  },

  /**
   * Get Key ID dynamically
   */
  getKeyId(): string {
    return (process.env.RAZORPAY_KEY_ID || '').trim();
  },

  /**
   * Get Key Secret dynamically
   */
  getKeySecret(): string {
    return (process.env.RAZORPAY_KEY_SECRET || '').trim();
  },

  /**
   * Check if Razorpay API keys are configured in server environment
   */
  isConfigured(): boolean {
    return Boolean(this.getKeyId() && this.getKeySecret());
  },

  /**
   * Check if Razorpay Webhook Secret is configured
   */
  isWebhookConfigured(): boolean {
    return Boolean(this.getWebhookSecret());
  },

  /**
   * Get non-sensitive payment gateway status for Admin Settings
   * (Secrets are NEVER included or exposed)
   */
  getGatewayStatus() {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    const webhookSecret = this.getWebhookSecret();
    const hasKeyId = Boolean(keyId);
    const hasKeySecret = Boolean(keySecret);
    const hasWebhook = Boolean(webhookSecret);
    const fullyConfigured = hasKeyId && hasKeySecret;

    let configurationStatus = 'Not Configured';
    let statusDescription = 'Razorpay credentials are not configured on the server.';

    if (hasKeyId && hasKeySecret && hasWebhook) {
      configurationStatus = 'Fully Configured';
      statusDescription = 'Key ID, Key Secret, and Webhook Secret are configured on the server.';
    } else if (hasKeyId && hasKeySecret) {
      configurationStatus = 'Payment Configuration Ready';
      statusDescription = 'Payment credentials are ready on the server. Webhook secret can optionally be configured.';
    } else if (hasKeyId && !hasKeySecret) {
      configurationStatus = 'Partially Configured';
      statusDescription = 'Razorpay Key ID is configured, but the server Key Secret is missing.';
    }

    return {
      provider: 'Razorpay',
      environment: 'TEST MODE',
      configured: fullyConfigured,
      keyIdPresent: hasKeyId,
      keySecretPresent: hasKeySecret,
      webhookSecretPresent: hasWebhook,
      keyIdStatus: (hasKeyId ? 'Configured' : 'Missing') as 'Configured' | 'Missing',
      keySecretStatus: (hasKeySecret ? 'Configured' : 'Missing') as 'Configured' | 'Missing',
      webhookSecretStatus: (hasWebhook ? 'Configured' : 'Missing') as 'Configured' | 'Missing',
      webhookStatus: (hasWebhook ? 'Configured' : 'Not Configured') as 'Configured' | 'Not Configured',
      webhookVerification: (hasWebhook ? 'Ready' : 'Not Ready') as 'Ready' | 'Not Ready',
      configurationStatus: configurationStatus,
      statusDescription: statusDescription,
      status: configurationStatus,
      keyId: keyId || 'Not Configured',
      webhookConfigured: hasWebhook,
      currency: (process.env.RAZORPAY_CURRENCY || 'INR').trim().toUpperCase(),
      webhookEndpoint: '/api/webhooks/razorpay'
    };
  },

  /**
   * Safe Test Connection for Admin Settings
   * Verifies Razorpay TEST credentials usability without creating customer payments or fake orders
   */
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    if (!RAZORPAY_KEY_ID) {
      return {
        connected: false,
        message: 'Razorpay TEST connection failed: Server Key ID (RAZORPAY_KEY_ID) is missing.'
      };
    }

    if (!RAZORPAY_KEY_SECRET) {
      return {
        connected: false,
        message: 'Razorpay TEST connection failed: Server Key Secret (RAZORPAY_KEY_SECRET) is missing.'
      };
    }

    const client = getRazorpayClient();
    if (!client) {
      return {
        connected: false,
        message: 'Razorpay TEST connection failed: Unable to initialize Razorpay client.'
      };
    }

    try {
      // Perform a safe read query in TEST mode (fetch max 1 item) to verify authentication with Razorpay API
      await client.orders.all({ count: 1 });
      return {
        connected: true,
        message: 'Razorpay TEST connection successful.'
      };
    } catch (err: any) {
      const errorDesc = err?.error?.description || err?.message || 'Authentication error with Razorpay API';
      return {
        connected: false,
        message: `Razorpay TEST connection failed: ${errorDesc}`
      };
    }
  },

  /**
   * Get public Razorpay Key ID for client-side checkout initiation
   * (Secrets are NEVER returned here)
   */
  getPublicKeyId(): string {
    return RAZORPAY_KEY_ID || '';
  },

  /**
   * Get authoritative gateway currency
   */
  getCurrency(): string {
    return RAZORPAY_CURRENCY || 'INR';
  },

  /**
   * Creates a Razorpay Order server-side with authoritative amount
   */
  async createOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
    if (!this.isConfigured()) {
      throw new Error('PAYMENT_UNAVAILABLE');
    }

    const subunits = Math.round(params.amount * 100);
    const client = getRazorpayClient();

    if (!client) {
      throw new Error('PAYMENT_UNAVAILABLE');
    }

    try {
      const order = await client.orders.create({
        amount: subunits,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes || {}
      });

      return {
        razorpayOrderId: order.id,
        amountInSubunits: Number(order.amount),
        currency: order.currency as 'INR' | 'USD'
      };
    } catch (err: any) {
      console.error('[RAZORPAY API ERROR] Order creation failed:', err?.error?.description || err.message);
      throw new Error(`Razorpay order creation failed: ${err?.error?.description || err.message}`);
    }
  },

  /**
   * Verify standard Razorpay Payment Signature
   * Signature is HMAC-SHA256 of `${razorpayOrderId}|${razorpayPaymentId}` with RAZORPAY_KEY_SECRET
   */
  verifyPaymentSignature(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): { valid: boolean; error?: string } {
    const keySecret = this.getKeySecret();
    if (!this.isConfigured() || !keySecret) {
      return { valid: false, error: 'Razorpay payment gateway is not configured' };
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return { valid: false, error: 'Missing payment signature verification parameters' };
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const receivedBuf = Buffer.from(razorpaySignature.trim(), 'utf8');

      if (expectedBuf.length !== receivedBuf.length) {
        return { valid: false, error: 'Invalid payment signature length' };
      }

      const isValid = crypto.timingSafeEqual(expectedBuf, receivedBuf);

      return { valid: isValid, error: isValid ? undefined : 'Payment signature verification failed' };
    } catch (err: any) {
      return { valid: false, error: 'Signature verification calculation error: ' + err.message };
    }
  },

  /**
   * Verify Razorpay Webhook Signature
   * Webhooks send raw payload and signature in 'x-razorpay-signature' header
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    const webhookSecret = this.getWebhookSecret();
    if (!webhookSecret || !signature) {
      return false;
    }

    const rawStr = typeof rawBody === 'string' ? rawBody : (Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : '');
    if (!rawStr || typeof signature !== 'string' || signature.trim().length === 0) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawStr)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const receivedBuf = Buffer.from(signature.trim(), 'utf8');

      if (expectedBuf.length !== receivedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch (err) {
      console.error('[WEBHOOK SIGNATURE VERIFICATION ERROR]', err);
      return false;
    }
  }
};

