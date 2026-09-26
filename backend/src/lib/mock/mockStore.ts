export const mockStore = {
  webhooks: new Map<string, any>(),
  waStatuses: new Map<string, string>(),

  recordWebhook(event: any) {
    this.webhooks.set(event.messageId || Date.now().toString(), event);
  },

  updateWaStatus(messageId: string, status: string) {
    this.waStatuses.set(messageId, status);
  },

  getWaStatus(messageId: string) {
    return this.waStatuses.get(messageId);
  }
};
