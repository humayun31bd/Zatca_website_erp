/**
 * WhatsApp Cloud API Client
 * Wraps the Meta Graph API for sending WhatsApp messages.
 */

export interface WhatsAppTemplatePayload {
  to: string;
  templateName: string;
  language: string;
  components: Array<{
    type: "header" | "body" | "button";
    sub_type?: string;
    index?: string;
    parameters: Array<{
      type: "text" | "document" | "currency";
      text?: string;
      document?: {
        link: string;
        filename: string;
      };
    }>;
  }>;
}

export class WhatsAppClient {
  private token: string;
  private phoneNumberId: string;
  private apiUrl: string;

  constructor() {
    this.token = process.env.WHATSAPP_TOKEN || 'MOCK_TOKEN';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_ID || 'MOCK_PHONE_ID';
    this.apiUrl = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Sends a pre-approved template message via WhatsApp Cloud API.
   * For the MVP, if the token is MOCK_TOKEN, it bypasses the actual fetch call.
   */
  async sendTemplateMessage(payload: WhatsAppTemplatePayload): Promise<{ success: boolean; messageId?: string; error?: any }> {
    if (this.token === 'MOCK_TOKEN') {
      console.log(`[WhatsApp Client] MOCK Mode: Sending template '${payload.templateName}' to ${payload.to}`);
      console.log(`[WhatsApp Client] Payload:`, JSON.stringify(payload.components, null, 2));
      return { success: true, messageId: `mock-wa-id-${Date.now()}` };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: payload.to,
          type: "template",
          template: {
            name: payload.templateName,
            language: { code: payload.language },
            components: payload.components,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "WhatsApp API Error");
      }

      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (error: any) {
      console.error("[WhatsApp Client] Failed to send message:", error);
      return { success: false, error: error.message };
    }
  }
}

export const waClient = new WhatsAppClient();
