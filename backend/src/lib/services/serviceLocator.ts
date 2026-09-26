import { IZatcaService, IWhatsAppService } from './interfaces';
import { MockZatcaService } from '../mock/mockZatcaService';
import { MockWhatsAppService } from '../mock/mockWhatsAppService';
import { LiveZatcaService } from '../live/liveZatcaService';
import { LiveWhatsAppService } from '../live/liveWhatsAppService';

class ServiceLocator {
  getZatcaService(): IZatcaService {
    if (process.env.USE_MOCK_API === 'true') {
      return new MockZatcaService();
    }
    return new LiveZatcaService();
  }

  getWhatsAppService(): IWhatsAppService {
    if (process.env.USE_MOCK_API === 'true') {
      return new MockWhatsAppService();
    }
    return new LiveWhatsAppService();
  }
}

export const serviceLocator = new ServiceLocator();
