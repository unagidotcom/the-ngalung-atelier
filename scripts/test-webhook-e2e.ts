import crypto from 'crypto';
import express from 'express';
import http from 'http';
import { razorpayService } from '../server/razorpay';
import { store } from '../server/dataStore';
import { emailService } from '../server/email';

async function runE2ETests() {
  console.log('================================================================');
  console.log('STEP 9A: RAZORPAY TEST MODE WEBHOOK SECURITY & IDEMPOTENCY SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // Create an Express instance replicating the exact server.ts webhook setup
  const app = express();
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      }
    })
  );
  app.use(express.urlencoded({ extended: true }));
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Malformed JSON payload' });
    }
    next(err);
  });

  // Attach webhook receiver exactly as configured in server.ts
  app.post('/api/webhooks/razorpay', async (req: express.Request, res: express.Response) => {
    try {
      const webhookSecret = razorpayService.getWebhookSecret();
      if (!webhookSecret) {
        return res.status(503).json({
          success: false,
          error: 'WEBHOOK_UNCONFIGURED',
          message: 'Razorpay webhook secret is not configured on the server.'
        });
      }

      const signature = (req.headers['x-razorpay-signature'] || req.get('x-razorpay-signature') || '') as string;
      if (!signature) {
        return res.status(400).json({ error: 'Missing X-Razorpay-Signature header' });
      }

      const rawBody = (req as any).rawBody;
      if (!rawBody || typeof rawBody !== 'string' || rawBody.length === 0) {
        return res.status(400).json({ error: 'Missing raw request body' });
      }

      if (!razorpayService.verifyWebhookSignature(rawBody, signature)) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }

      const event = req.body;
      if (!event || typeof event !== 'object' || typeof event.event !== 'string') {
        return res.status(400).json({ error: 'Invalid webhook payload structure' });
      }

      const eventId = (event.id || req.headers['x-razorpay-event-id'] || '') as string;
      if (eventId && store.hasProcessedWebhookEvent(eventId)) {
        return res.json({
          status: 'ok',
          received: true,
          duplicate: true,
          message: `Event ${eventId} has already been processed.`
        });
      }

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
          if (eventId) store.recordWebhookEvent(eventId, event.event);
          return res.json({ status: 'ok', received: true, message: 'No matching local order record found' });
        }

        const product = store.getProductById(order.productId) || store.getProductBySlug(order.productSlug);
        if (!product) {
          return res.status(400).json({ error: 'Product association invalid' });
        }

        if (order.razorpayOrderId && rzpOrderId && order.razorpayOrderId !== rzpOrderId) {
          return res.status(400).json({ error: 'Order ID mismatch' });
        }

        const paidAmountSubunits = paymentPayload?.amount || orderPayload?.amount;
        const expectedSubunits = Math.round(order.amount * 100);
        if (paidAmountSubunits !== undefined && Number(paidAmountSubunits) !== expectedSubunits) {
          return res.status(400).json({ error: 'Amount mismatch' });
        }

        const paidCurrency = (paymentPayload?.currency || orderPayload?.currency || '').toUpperCase();
        if (paidCurrency && paidCurrency !== order.currency.toUpperCase()) {
          return res.status(400).json({ error: 'Currency mismatch' });
        }

        if (order.status === 'paid') {
          if (eventId) store.recordWebhookEvent(eventId, event.event, order.id);
          return res.json({
            status: 'ok',
            received: true,
            alreadyPaid: true,
            orderNumber: order.orderNumber
          });
        }

        const updated = store.updateOrderStatus(order.id, 'paid', {
          razorpayOrderId: rzpOrderId || order.razorpayOrderId,
          razorpayPaymentId: paymentPayload?.id || order.razorpayPaymentId,
          gatewayPaymentId: paymentPayload?.id || order.gatewayPaymentId,
          paymentMethod: 'RAZORPAY'
        });

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
      } else if (event.event === 'payment.failed') {
        const paymentPayload = event.payload?.payment?.entity;
        const notes = paymentPayload?.notes || {};
        const internalOrderId = notes.internalOrderId || notes.orderId;
        const rzpOrderId = paymentPayload?.order_id;

        const order =
          (internalOrderId ? store.getOrderById(internalOrderId) : undefined) ||
          (rzpOrderId ? store.getOrderByRazorpayOrderId(rzpOrderId) : undefined);

        if (order) {
          if (order.status === 'paid' || order.status === 'refunded') {
            if (eventId) store.recordWebhookEvent(eventId, event.event, order.id);
            return res.json({
              status: 'ok',
              received: true,
              ignored: true,
              message: `Order is already in finalized status '${order.status}'`
            });
          }

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
        if (eventId) {
          store.recordWebhookEvent(eventId, event.event);
        }
        return res.json({ status: 'ok', received: true, ignored: true, event: event.event });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal webhook error' });
    }
  });

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/webhooks/razorpay`;

  const TEST_SECRET = 'whsec_test_secret_abc123';

  async function postWebhook(body: any, headers: Record<string, string> = {}) {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const resp = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: rawBody
    });
    let data;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }
    return { status: resp.status, data };
  }

  function signPayload(payloadStr: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
  }

  try {
    // -------------------------------------------------------------
    // SCENARIO 1: Missing Webhook Secret
    // -------------------------------------------------------------
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const res1 = await postWebhook({ event: 'payment.captured' }, { 'x-razorpay-signature': 'dummy' });
    assert(res1.status === 503 && res1.data?.error === 'WEBHOOK_UNCONFIGURED', 'Scenario 1: Missing webhook secret returns 503 WEBHOOK_UNCONFIGURED');

    // Configure test secret for remaining tests
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    // -------------------------------------------------------------
    // SCENARIO 2: Missing Signature Header
    // -------------------------------------------------------------
    const res2 = await postWebhook({ event: 'payment.captured' });
    assert(res2.status === 400 && res2.data?.error === 'Missing X-Razorpay-Signature header', 'Scenario 2: Missing signature header returns 400');

    // -------------------------------------------------------------
    // SCENARIO 3: Invalid Signature
    // -------------------------------------------------------------
    const res3 = await postWebhook({ event: 'payment.captured' }, { 'x-razorpay-signature': '0000000000000000000000000000000000000000000000000000000000000000' });
    assert(res3.status === 400 && res3.data?.error === 'Invalid webhook signature', 'Scenario 3: Invalid signature returns 400');

    // -------------------------------------------------------------
    // SCENARIO 4: Valid Signature on Unknown Event
    // -------------------------------------------------------------
    const unknownEvent = { id: 'evt_unknown_001', event: 'subscription.charged' };
    const rawUnknown = JSON.stringify(unknownEvent);
    const sigUnknown = signPayload(rawUnknown, TEST_SECRET);
    const res4 = await postWebhook(rawUnknown, { 'x-razorpay-signature': sigUnknown });
    assert(res4.status === 200 && res4.data?.ignored === true, 'Scenario 4: Unknown valid event returns 200 with ignored: true');

    // -------------------------------------------------------------
    // SCENARIO 5: payment.captured
    // -------------------------------------------------------------
    const product = store.getProducts()[0];
    const order1 = store.createOrder({
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      productCover: product.coverImage,
      productCategory: product.category,
      amount: product.priceINR,
      currency: 'INR',
      buyerName: 'Webhook Client A',
      buyerEmail: 'webhook-client-a@local.test',
      status: 'pending',
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: 'order_rzp_e2e_1'
    });
    const order1Token = order1.accessToken;

    const eventPayload1 = {
      id: 'evt_pay_cap_001',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_e2e_1',
            order_id: 'order_rzp_e2e_1',
            amount: Math.round(product.priceINR * 100),
            currency: 'INR',
            notes: {
              internalOrderId: order1.id
            }
          }
        }
      }
    };
    const rawEvent1 = JSON.stringify(eventPayload1);
    const sigEvent1 = signPayload(rawEvent1, TEST_SECRET);
    const res5 = await postWebhook(rawEvent1, { 'x-razorpay-signature': sigEvent1 });
    const order1Updated = store.getOrderById(order1.id);
    assert(
      res5.status === 200 && order1Updated?.status === 'paid' && order1Updated?.accessToken === order1Token,
      'Scenario 5: payment.captured marks order PAID and preserves access token'
    );

    // -------------------------------------------------------------
    // SCENARIO 6: Duplicate payment.captured (Idempotency)
    // -------------------------------------------------------------
    const res6 = await postWebhook(rawEvent1, { 'x-razorpay-signature': sigEvent1 });
    assert(
      res6.status === 200 && res6.data?.duplicate === true,
      'Scenario 6: Duplicate payment.captured acknowledged as duplicate safely'
    );

    // -------------------------------------------------------------
    // SCENARIO 7: order.paid
    // -------------------------------------------------------------
    const order2 = store.createOrder({
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      productCover: product.coverImage,
      productCategory: product.category,
      amount: product.priceINR,
      currency: 'INR',
      buyerName: 'Webhook Client B',
      buyerEmail: 'webhook-client-b@local.test',
      status: 'pending',
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: 'order_rzp_e2e_2'
    });
    const order2Token = order2.accessToken;

    const eventPayload2 = {
      id: 'evt_ord_paid_002',
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: 'order_rzp_e2e_2',
            amount: Math.round(product.priceINR * 100),
            currency: 'INR',
            receipt: order2.orderNumber,
            notes: {
              internalOrderId: order2.id
            }
          }
        },
        payment: {
          entity: {
            id: 'pay_rzp_e2e_2',
            order_id: 'order_rzp_e2e_2',
            amount: Math.round(product.priceINR * 100),
            currency: 'INR'
          }
        }
      }
    };
    const rawEvent2 = JSON.stringify(eventPayload2);
    const sigEvent2 = signPayload(rawEvent2, TEST_SECRET);
    const res7 = await postWebhook(rawEvent2, { 'x-razorpay-signature': sigEvent2 });
    const order2Updated = store.getOrderById(order2.id);
    assert(
      res7.status === 200 && order2Updated?.status === 'paid' && order2Updated?.accessToken === order2Token,
      'Scenario 7: order.paid marks order PAID and preserves access token'
    );

    // -------------------------------------------------------------
    // SCENARIO 8: Duplicate order.paid (Idempotency)
    // -------------------------------------------------------------
    const res8 = await postWebhook(rawEvent2, { 'x-razorpay-signature': sigEvent2 });
    assert(
      res8.status === 200 && res8.data?.duplicate === true,
      'Scenario 8: Duplicate order.paid acknowledged as duplicate without mutations'
    );

    // -------------------------------------------------------------
    // SCENARIO 9: payment.failed on Pending Order
    // -------------------------------------------------------------
    const order3 = store.createOrder({
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      productCover: product.coverImage,
      productCategory: product.category,
      amount: product.priceINR,
      currency: 'INR',
      buyerName: 'Webhook Client C',
      buyerEmail: 'webhook-client-c@local.test',
      status: 'pending',
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: 'order_rzp_e2e_3'
    });

    const eventPayload3 = {
      id: 'evt_pay_fail_003',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_fail_003',
            order_id: 'order_rzp_e2e_3',
            notes: {
              internalOrderId: order3.id
            }
          }
        }
      }
    };
    const rawEvent3 = JSON.stringify(eventPayload3);
    const sigEvent3 = signPayload(rawEvent3, TEST_SECRET);
    const res9 = await postWebhook(rawEvent3, { 'x-razorpay-signature': sigEvent3 });
    const order3Updated = store.getOrderById(order3.id);
    assert(
      res9.status === 200 && order3Updated?.status === 'failed',
      'Scenario 9: payment.failed marks pending order as failed'
    );

    // -------------------------------------------------------------
    // SCENARIO 10: payment.failed against already PAID order
    // -------------------------------------------------------------
    const eventPayloadFailPaid = {
      id: 'evt_pay_fail_on_paid_004',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_fail_004',
            order_id: 'order_rzp_e2e_1', // Order 1 is already paid
            notes: {
              internalOrderId: order1.id
            }
          }
        }
      }
    };
    const rawEventFailPaid = JSON.stringify(eventPayloadFailPaid);
    const sigEventFailPaid = signPayload(rawEventFailPaid, TEST_SECRET);
    const res10 = await postWebhook(rawEventFailPaid, { 'x-razorpay-signature': sigEventFailPaid });
    const order1PostFail = store.getOrderById(order1.id);
    assert(
      res10.status === 200 && order1PostFail?.status === 'paid',
      'Scenario 10: payment.failed NEVER downgrades already PAID order'
    );

    // -------------------------------------------------------------
    // SCENARIO 11: Browser verification followed by Webhook
    // -------------------------------------------------------------
    const order4 = store.createOrder({
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      productCover: product.coverImage,
      productCategory: product.category,
      amount: product.priceINR,
      currency: 'INR',
      buyerName: 'Browser First Client',
      buyerEmail: 'browser-first@local.test',
      status: 'pending',
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: 'order_rzp_e2e_4'
    });
    // Simulate browser verification marking it paid first
    store.updateOrderStatus(order4.id, 'paid', {
      razorpayPaymentId: 'pay_browser_first_4',
      gatewayPaymentId: 'pay_browser_first_4'
    });
    const order4AfterBrowser = store.getOrderById(order4.id);
    assert(order4AfterBrowser?.status === 'paid', 'Browser verification marks order PAID first');

    // Now webhook arrives later with distinct event ID
    const eventPayload4 = {
      id: 'evt_webhook_later_005',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_browser_first_4',
            order_id: 'order_rzp_e2e_4',
            amount: Math.round(product.priceINR * 100),
            currency: 'INR',
            notes: {
              internalOrderId: order4.id
            }
          }
        }
      }
    };
    const rawEvent4 = JSON.stringify(eventPayload4);
    const sigEvent4 = signPayload(rawEvent4, TEST_SECRET);
    const res11 = await postWebhook(rawEvent4, { 'x-razorpay-signature': sigEvent4 });
    const order4PostWebhook = store.getOrderById(order4.id);
    assert(
      res11.status === 200 && res11.data?.alreadyPaid === true && order4PostWebhook?.status === 'paid',
      'Scenario 11: Webhook arriving after browser verification preserves PAID without side-effects'
    );

    // -------------------------------------------------------------
    // SCENARIO 12: Webhook followed by Browser verification
    // -------------------------------------------------------------
    const order5 = store.createOrder({
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      productCover: product.coverImage,
      productCategory: product.category,
      amount: product.priceINR,
      currency: 'INR',
      buyerName: 'Webhook First Client',
      buyerEmail: 'webhook-first@local.test',
      status: 'pending',
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: 'order_rzp_e2e_5'
    });
    const order5InitialToken = order5.accessToken;

    const eventPayload5 = {
      id: 'evt_webhook_first_006',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_first_5',
            order_id: 'order_rzp_e2e_5',
            amount: Math.round(product.priceINR * 100),
            currency: 'INR',
            notes: {
              internalOrderId: order5.id
            }
          }
        }
      }
    };
    const rawEvent5 = JSON.stringify(eventPayload5);
    const sigEvent5 = signPayload(rawEvent5, TEST_SECRET);
    const res12 = await postWebhook(rawEvent5, { 'x-razorpay-signature': sigEvent5 });
    const order5AfterWebhook = store.getOrderById(order5.id);
    assert(
      res12.status === 200 && order5AfterWebhook?.status === 'paid',
      'Scenario 12a: Webhook marks order PAID first'
    );

    // Simulate browser verification endpoint called afterwards
    const order5AfterBrowser = store.updateOrderStatus(order5.id, 'paid', {
      razorpayPaymentId: 'pay_webhook_first_5'
    });
    assert(
      order5AfterBrowser?.status === 'paid' && order5AfterBrowser?.accessToken === order5InitialToken,
      'Scenario 12b: Browser verification afterwards returns existing PAID order without creating duplicates'
    );

    // -------------------------------------------------------------
    // SCENARIO 13: Malformed Payload (Invalid JSON)
    // -------------------------------------------------------------
    const malformedPayload = '{"event": "payment.captured", "payload": { INVALID JSON';
    const sigMalformed = signPayload(malformedPayload, TEST_SECRET);
    const res13 = await postWebhook(malformedPayload, { 'x-razorpay-signature': sigMalformed });
    assert(
      res13.status === 400,
      'Scenario 13: Malformed payload rejected with 400 Bad Request'
    );

  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error('Test suite failed with uncaught exception:', err);
  process.exit(1);
});
