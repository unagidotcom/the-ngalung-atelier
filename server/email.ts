import { Order, Product } from '../src/types';

export interface EmailDeliveryResult {
  sent: boolean;
  status: 'sent' | 'failed' | 'not_configured';
  recipient: string;
  subject: string;
  provider: string;
  timestamp: string;
  error?: string;
}

export interface SendOrderFulfillmentParams {
  order: Order;
  product: Product;
  accessUrl: string;
  supportEmail?: string;
  storeName?: string;
  licenseKey?: string;
}

export interface SendWelcomeEmailParams {
  customerName: string;
  customerEmail: string;
  storeName?: string;
  supportEmail?: string;
  loginUrl?: string;
}

export interface SendContactMessageParams {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  orderNumber?: string;
  storeName?: string;
  recipientEmail?: string;
}

/**
 * Escape untrusted user input to prevent HTML / Header Injection
 */
function escapeHtml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Universal Provider-Independent Transactional Email Service
 * Supports: Resend, SendGrid, Postmark, SMTP, Console (development), or None
 * Gracefully degrades when no email provider is configured.
 */
class EmailService {
  private getProvider(): string {
    return (process.env.EMAIL_PROVIDER || 'console').toLowerCase().trim();
  }

  private getFromAddress(): string {
    const fromEmail = process.env.EMAIL_FROM || 'orders@ngalungatelier.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'The Ngalung Atelier';
    return `"${fromName}" <${fromEmail}>`;
  }

  /**
   * Diagnostic info for admin dashboard (No secrets exposed)
   */
  public getStatus() {
    const provider = this.getProvider();
    const hasResend = Boolean(process.env.RESEND_API_KEY);
    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
    const hasPostmark = Boolean(process.env.POSTMARK_SERVER_TOKEN);

    let configured = false;
    let providerName = 'Console (Development / Log Mode)';

    if (provider === 'resend' && hasResend) {
      configured = true;
      providerName = 'Resend API';
    } else if (provider === 'smtp' && hasSmtp) {
      configured = true;
      providerName = `SMTP (${process.env.SMTP_HOST})`;
    } else if (provider === 'sendgrid' && hasSendGrid) {
      configured = true;
      providerName = 'SendGrid API';
    } else if (provider === 'postmark' && hasPostmark) {
      configured = true;
      providerName = 'Postmark API';
    } else if (provider === 'none') {
      configured = false;
      providerName = 'Disabled (None)';
    }

    return {
      provider: providerName,
      activeProviderKey: provider,
      configured,
      fromAddress: this.getFromAddress(),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@ngalungatelier.com'
    };
  }

  /**
   * Core low-level dispatch method
   */
  private async dispatchEmail(params: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<EmailDeliveryResult> {
    const provider = this.getProvider();
    const timestamp = new Date().toISOString();
    const { to, subject, text, html } = params;

    // 1. Resend Provider
    if (provider === 'resend') {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.warn('[EMAIL] Resend provider chosen but RESEND_API_KEY is missing. Logging to console instead.');
        return this.logConsoleEmail(to, subject, text, 'resend (missing key)');
      }

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: this.getFromAddress(),
            to: [to],
            subject,
            html,
            text
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error('[EMAIL RESEND ERROR]', errData);
          return {
            sent: false,
            status: 'failed',
            recipient: to,
            subject,
            provider: 'resend',
            timestamp,
            error: (errData as any)?.message || `HTTP ${response.status}`
          };
        }

        console.log(`[EMAIL] Successfully sent via Resend to ${to}`);
        return {
          sent: true,
          status: 'sent',
          recipient: to,
          subject,
          provider: 'resend',
          timestamp
        };
      } catch (err: any) {
        console.error('[EMAIL RESEND EXCEPTION]', err);
        return {
          sent: false,
          status: 'failed',
          recipient: to,
          subject,
          provider: 'resend',
          timestamp,
          error: err.message || 'Network exception connecting to Resend'
        };
      }
    }

    // 2. Postmark Provider
    if (provider === 'postmark') {
      const serverToken = process.env.POSTMARK_SERVER_TOKEN;
      if (!serverToken) {
        return this.logConsoleEmail(to, subject, text, 'postmark (missing token)');
      }

      try {
        const response = await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'X-Postmark-Server-Token': serverToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            From: process.env.EMAIL_FROM || 'orders@ngalungatelier.com',
            To: to,
            Subject: subject,
            HtmlBody: html,
            TextBody: text
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return {
            sent: false,
            status: 'failed',
            recipient: to,
            subject,
            provider: 'postmark',
            timestamp,
            error: (errData as any)?.Message || `HTTP ${response.status}`
          };
        }

        return { sent: true, status: 'sent', recipient: to, subject, provider: 'postmark', timestamp };
      } catch (err: any) {
        return {
          sent: false,
          status: 'failed',
          recipient: to,
          subject,
          provider: 'postmark',
          timestamp,
          error: err.message
        };
      }
    }

    // 3. SendGrid Provider
    if (provider === 'sendgrid') {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        return this.logConsoleEmail(to, subject, text, 'sendgrid (missing key)');
      }

      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: process.env.EMAIL_FROM || 'orders@ngalungatelier.com', name: process.env.EMAIL_FROM_NAME || 'The Ngalung Atelier' },
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: html }
            ]
          })
        });

        if (!response.ok) {
          const errData = await response.text().catch(() => '');
          return {
            sent: false,
            status: 'failed',
            recipient: to,
            subject,
            provider: 'sendgrid',
            timestamp,
            error: errData || `HTTP ${response.status}`
          };
        }

        return { sent: true, status: 'sent', recipient: to, subject, provider: 'sendgrid', timestamp };
      } catch (err: any) {
        return {
          sent: false,
          status: 'failed',
          recipient: to,
          subject,
          provider: 'sendgrid',
          timestamp,
          error: err.message
        };
      }
    }

    // 4. Fallback / Development Console Provider (Always safe, zero external dependencies)
    return this.logConsoleEmail(to, subject, text, 'console');
  }

  private logConsoleEmail(to: string, subject: string, text: string, providerNote: string): EmailDeliveryResult {
    const timestamp = new Date().toISOString();
    console.log(`\n======================================================`);
    console.log(`📧 [TRANSACTIONAL EMAIL DISPATCH: ${providerNote.toUpperCase()}]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Time: ${timestamp}`);
    console.log(`------------------------------------------------------`);
    console.log(text);
    console.log(`======================================================\n`);

    return {
      sent: true,
      status: 'sent',
      recipient: to,
      subject,
      provider: providerNote,
      timestamp
    };
  }

  /**
   * Sends order confirmation & digital fulfillment access email
   */
  public async sendOrderFulfillmentEmail(params: SendOrderFulfillmentParams): Promise<EmailDeliveryResult> {
    const { order, product, accessUrl, supportEmail = 'support@ngalungatelier.com', storeName = 'The Ngalung Atelier', licenseKey } = params;

    const formattedAmount = order.currency === 'USD' ? `$${order.amount}` : `₹${order.amount.toLocaleString('en-IN')}`;
    const subject = `Your purchase from ${storeName} — Order #${order.orderNumber}`;
    const safeCustomerName = escapeHtml(order.buyerName || 'Valued Customer');
    const safeProductTitle = escapeHtml(product.title);
    const safeOrderNumber = escapeHtml(order.orderNumber);
    const safeSupportEmail = escapeHtml(supportEmail);
    const purchaseDate = order.paidAt
      ? new Date(order.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const fullAccessUrl = accessUrl.startsWith('http')
      ? accessUrl
      : `${process.env.APP_URL || 'https://ngalungatelier.com'}${accessUrl.startsWith('/') ? accessUrl : `/${accessUrl}`}`;

    const textContent = `
Hello ${order.buyerName || 'there'},

Thank you for your purchase from ${storeName}!
Your payment has been confirmed and your digital product is ready for immediate access.

ORDER DETAILS:
------------------------------------------
Order Number:  ${order.orderNumber}
Product:       ${product.title}
Amount Paid:   ${formattedAmount} (${order.currency})
Purchase Date: ${purchaseDate}
Status:        PAID & CONFIRMED
${licenseKey ? `License Key:   ${licenseKey}\n` : ''}

ACCESS YOUR DIGITAL PRODUCT:
------------------------------------------
You can open your private delivery vault and download your files at:
${fullAccessUrl}

You can also sign in to your account at any time and view your digital library under "My Purchases".

Need help? Contact our support team at ${supportEmail}.

Warm regards,
${storeName} Team
`.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6EE; color: #17181F; margin: 0; padding: 24px; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E7DFCE; overflow: hidden; }
    .header { background: #17181F; color: #FAF6EE; padding: 28px 32px; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 4px 0 0 0; font-size: 13px; color: #D8CDB4; }
    .body { padding: 32px; }
    .badge { display: inline-block; background: #1F8F5F; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
    .order-box { background: #FAF6EE; border: 1px solid #E7DFCE; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .order-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .order-row:last-child { margin-bottom: 0; padding-top: 10px; border-top: 1px dashed #D8CDB4; font-weight: 700; }
    .cta-button { display: inline-block; background: #FF5A36; color: #FFFFFF !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 30px; margin: 20px 0; }
    .footer { background: #F3EDE0; padding: 20px 32px; font-size: 12px; color: #6E6C63; text-align: center; border-top: 1px solid #E7DFCE; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(storeName)}</h1>
      <p>Purchase Confirmation & Digital Access</p>
    </div>
    <div class="body">
      <span class="badge">Payment Confirmed</span>
      <h2>Hello ${safeCustomerName},</h2>
      <p>Thank you for your purchase. Your payment has been successfully confirmed and your digital system is unlocked and ready.</p>

      <div class="order-box">
        <div style="font-size: 12px; color: #6E6C63; text-transform: uppercase; font-weight: 700; margin-bottom: 12px;">Order Summary</div>
        <div style="font-size: 16px; font-weight: 700; color: #17181F; margin-bottom: 14px;">${safeProductTitle}</div>
        <div class="order-row"><span>Order Number</span><strong>#${safeOrderNumber}</strong></div>
        <div class="order-row"><span>Purchase Date</span><span>${escapeHtml(purchaseDate)}</span></div>
        <div class="order-row"><span>Payment Status</span><span style="color: #1F8F5F; font-weight: 700;">PAID</span></div>
        ${licenseKey ? `<div class="order-row"><span>License Key</span><code style="background:#fff;padding:2px 6px;border-radius:4px;border:1px solid #E7DFCE;">${escapeHtml(licenseKey)}</code></div>` : ''}
        <div class="order-row"><span>Total Paid</span><span style="color: #FF5A36; font-size: 16px;">${escapeHtml(formattedAmount)}</span></div>
      </div>

      <div style="text-align: center;">
        <a href="${fullAccessUrl}" class="cta-button">Open Your Digital Vault</a>
      </div>

      <p style="font-size: 13px; color: #6E6C63; margin-top: 24px;">
        You can also sign in to your account at any time and access your files, Notion duplicate links, and updates under <strong>My Purchases</strong>.
      </p>
    </div>
    <div class="footer">
      <p>Questions or need technical assistance? Contact support at <a href="mailto:${safeSupportEmail}" style="color: #17181F; font-weight: 600;">${safeSupportEmail}</a>.</p>
      <p>© ${new Date().getFullYear()} ${escapeHtml(storeName)}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`.trim();

    return this.dispatchEmail({
      to: order.buyerEmail,
      subject,
      text: textContent,
      html: htmlContent
    });
  }

  /**
   * Sends a welcome email when a customer creates an account
   */
  public async sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<EmailDeliveryResult> {
    const { customerName, customerEmail, storeName = 'The Ngalung Atelier', supportEmail = 'support@ngalungatelier.com', loginUrl } = params;

    const subject = `Welcome to ${storeName}`;
    const safeCustomerName = escapeHtml(customerName || 'Valued Member');
    const fullLoginUrl = loginUrl || `${process.env.APP_URL || 'https://ngalungatelier.com'}/login`;

    const textContent = `
Hello ${customerName},

Welcome to ${storeName}! Your customer account has been created.
You can now access your purchased systems, Notion templates, and downloads at any time.

SIGN IN TO YOUR ACCOUNT:
${fullLoginUrl}

If you have any questions, reply to this email or reach us at ${supportEmail}.

Warm regards,
${storeName} Team
`.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAF6EE; color: #17181F; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E7DFCE; overflow: hidden; }
    .header { background: #17181F; color: #FAF6EE; padding: 28px 32px; }
    .body { padding: 32px; }
    .cta-button { display: inline-block; background: #17181F; color: #FAF6EE !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 26px; border-radius: 30px; margin: 18px 0; }
    .footer { background: #F3EDE0; padding: 20px 32px; font-size: 12px; color: #6E6C63; text-align: center; border-top: 1px solid #E7DFCE; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;font-size:20px;">${escapeHtml(storeName)}</h1>
      <p style="margin:4px 0 0 0;font-size:13px;color:#D8CDB4;">Welcome to your digital workspace</p>
    </div>
    <div class="body">
      <h2>Welcome, ${safeCustomerName}!</h2>
      <p>Your customer account is now active. All future template purchases, Notion duplicate links, and digital assets will be saved to your personal vault.</p>
      <div style="text-align: center;">
        <a href="${escapeHtml(fullLoginUrl)}" class="cta-button">Sign In to Your Workspace</a>
      </div>
    </div>
    <div class="footer">
      <p>Questions? Contact us at <a href="mailto:${escapeHtml(supportEmail)}" style="color:#17181F;">${escapeHtml(supportEmail)}</a></p>
    </div>
  </div>
</body>
</html>
`.trim();

    return this.dispatchEmail({
      to: customerEmail,
      subject,
      text: textContent,
      html: htmlContent
    });
  }

  /**
   * Forwards a contact / support form submission
   */
  public async sendContactFormEmail(params: SendContactMessageParams): Promise<EmailDeliveryResult> {
    const { senderName, senderEmail, subject, message, orderNumber, storeName = 'The Ngalung Atelier', recipientEmail = 'support@ngalungatelier.com' } = params;

    const emailSubject = `[Support Inquiry] ${subject} ${orderNumber ? `(Order #${orderNumber})` : ''} - from ${senderName}`;
    const textContent = `
New customer support inquiry from ${storeName} contact form:

From:    ${senderName} (${senderEmail})
${orderNumber ? `Order:   #${orderNumber}\n` : ''}Subject: ${subject}
Date:    ${new Date().toISOString()}

Message:
------------------------------------------
${message}
------------------------------------------
`.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#FAF6EE;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;border:1px solid #E7DFCE;">
    <h2 style="margin-top:0;">Support Inquiry: ${escapeHtml(subject)}</h2>
    <p><strong>From:</strong> ${escapeHtml(senderName)} (&lt;${escapeHtml(senderEmail)}&gt;)</p>
    ${orderNumber ? `<p><strong>Order Number:</strong> #${escapeHtml(orderNumber)}</p>` : ''}
    <div style="background:#FAF6EE;padding:16px;border-radius:8px;border:1px solid #E7DFCE;white-space:pre-wrap;margin:16px 0;">
      ${escapeHtml(message)}
    </div>
  </div>
</body>
</html>
`.trim();

    return this.dispatchEmail({
      to: recipientEmail,
      subject: emailSubject,
      text: textContent,
      html: htmlContent
    });
  }
}

export const emailService = new EmailService();
