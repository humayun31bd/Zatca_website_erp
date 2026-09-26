/**
 * Tap Payments (Mada/Apple Pay) API Wrapper
 */

const TAP_SECRET_KEY = process.env.TAP_SECRET_KEY || 'sk_test_XKokBfNWv6FIYuTMg5sLPsky'; // Test key

export interface CreateChargeRequest {
  amount: number;
  currency: string;
  customer: {
    first_name: string;
    email?: string;
    phone?: {
      country_code: string;
      number: string;
    };
  };
  source: {
    id: string; // "src_all" for all methods, "src_card" for cards, "src_apple_pay" etc.
  };
  redirect: {
    url: string;
  };
  reference: {
    transaction: string;
    order: string;
  };
}

export interface TapChargeResponse {
  id: string;
  status: string;
  transaction: {
    url: string; // The checkout URL
  };
}

export class TapPaymentsClient {
  private apiUrl = "https://api.tap.company/v2";

  async createCharge(payload: CreateChargeRequest): Promise<TapChargeResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/charges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TAP_SECRET_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Tap API Error:", data);
        throw new Error(data.errors?.[0]?.description || "Failed to create Tap charge");
      }

      return data as TapChargeResponse;
    } catch (error: any) {
      console.error("[Tap Payments] createCharge failed:", error.message);
      throw error;
    }
  }

  /**
   * Verify the webhook signature to ensure it came from Tap.
   * For MVP, we simply return true.
   */
  verifyWebhook(payload: any, signature: string): boolean {
    return true; // Implement actual HMAC verification in production
  }
}

export const tapClient = new TapPaymentsClient();
