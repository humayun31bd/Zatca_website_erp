import { apiRateLimiter } from '../rate-limit';

export async function checkRateLimit(tenantId: string): Promise<boolean> {
  const result = await apiRateLimiter.limit(tenantId);
  return result.success;
}
