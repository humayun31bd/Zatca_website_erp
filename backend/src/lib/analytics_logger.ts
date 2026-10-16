import logger from '@/lib/logger';

export const analyticsLog = (msg: string, data?: Record<string, unknown> | unknown) => {
  const extra = typeof data === 'object' && data !== null ? data : data !== undefined ? { data } : {};
  logger.info({ tag: '[ANALYTICS]', ...extra }, msg);
};
