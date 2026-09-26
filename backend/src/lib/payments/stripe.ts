import Stripe from 'stripe';

export class StripePaymentsClient {
  private clientMap = new Map<string, Stripe>();

  /**
   * Retrieves or initializes a Stripe client for a specific tenant.
   * Caches the instance in memory to avoid recreation.
   */
  private getClient(secretKey: string): Stripe {
    if (!this.clientMap.has(secretKey)) {
      this.clientMap.set(secretKey, new Stripe(secretKey, {
        apiVersion: '2026-08-26.dahlia' as any, 
      }));
    }
    return this.clientMap.get(secretKey)!;
  }

  async createCheckoutSession(params: {
    secretKey: string;
    amount: number;
    currency: string;
    invoiceId: string;
    invoiceNumber: string;
    customerEmail?: string;
    returnUrl: string;
  }) {
    const stripe = this.getClient(params.secretKey);
    
    // Convert decimal SAR/USD to cents
    const unitAmount = Math.round(params.amount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: params.customerEmail,
      client_reference_id: params.invoiceId,
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: `Invoice ${params.invoiceNumber}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: params.returnUrl,
      cancel_url: params.returnUrl,
      metadata: {
        invoiceId: params.invoiceId,
        invoiceNumber: params.invoiceNumber,
      }
    });

    return session;
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string, webhookSecret: string): Stripe.Event {
    const stripe = new Stripe(webhookSecret, { apiVersion: '2026-08-26.dahlia' as any });
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}

export const stripeClient = new StripePaymentsClient();
