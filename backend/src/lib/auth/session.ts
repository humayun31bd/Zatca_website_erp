import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.SESSION_SECRET || 'super-secret-key-for-local-dev-only-change-in-prod';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4 hours from now')
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload;
}

export async function createSession(userId: string, role: string, email: string, tenantId?: string) {
  const session = await encrypt({ userId, role, email, tenantId });

  cookies().set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });

  return session;
}

export async function verifySession(request?: Request) {
  let token = cookies().get('session')?.value;
  
  if (!token && request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    console.log('verifySession: No token found in cookies or Authorization header');
    return null;
  }

  try {
    const payload = await decrypt(token);
    return payload;
  } catch (error) {
    console.error('verifySession: decrypt error', error);
    try {
      cookies().delete('session');
    } catch (e) {
      // Ignore if called from middleware or place where setting cookies is not allowed
    }
    return null;
  }
}

export async function deleteSession() {
  cookies().delete('session');
}
