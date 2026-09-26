import { IWhatsAppService } from '../services/interfaces';
import { WaDeliveryPayload, WaDeliveryResult } from '@/types/whatsapp';
import { mockStore } from './mockStore';

export class MockWhatsAppService implements IWhatsAppService {
  async sendInvoice(payload: WaDeliveryPayload): Promise<WaDeliveryResult> {
    console.log(`Mock WA Service: Queuing invoice ${payload.invoiceNumber} for ${payload.to}`);
    const messageId = `msg_${Date.now()}`;
    
    // Simulate async webhook delivery update
    setTimeout(() => {
      mockStore.updateWaStatus(messageId, 'DELIVERED');
    }, 1000);

    return {
      messageId,
      status: 'QUEUED',
    };
  }
}
