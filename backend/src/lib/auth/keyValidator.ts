import { db } from '../db';
import { apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export interface AuthContext {
  tenantId: string;
  scopes: string[];
}

export async function validateApiKey(request: Request): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  
  if (process.env.USE_MOCK_API === 'true') {
    if (token === process.env.MOCK_API_KEY) {
      return { tenantId: 'mock-tenant-id', scopes: ['SUPERADMIN'] }; 
    }
    return null;
  }
  
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);
  
  if (result.length > 0) {
    const key = result[0];
    if (key.expiresAt && key.expiresAt < new Date()) {
       return null;
    }
    return {
      tenantId: key.tenantId,
      scopes: key.scopes || [],
    };
  }
  
  return null;
}
