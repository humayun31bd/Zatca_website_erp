import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/', '/invoices', '/settings'];
const publicRoutes = ['/login'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Block Malicious Hacking Attempts & Probes
  if (
    path.includes('.env') ||
    path.includes('.git') ||
    path.includes('wp-admin') ||
    path.includes('etc/passwd') ||
    path.includes('phpinfo') ||
    path.includes('eval-stdin')
  ) {
    return new NextResponse('Access Denied: Malicious Request Blocked', { status: 403 });
  }
  
  // Handle preflight OPTIONS requests globally
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin') ?? '*';
    return new NextResponse(null, { 
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-tenant-id',
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  }

  // Auto-correct duplicate /api/v1/api/v1/ path prefixes from mobile/frontend
  if (path.startsWith('/api/v1/api/v1/')) {
    const cleanPath = path.replace(/^\/api\/v1\/api\/v1\//, '/api/v1/');
    const url = request.nextUrl.clone();
    url.pathname = cleanPath;
    return NextResponse.rewrite(url);
  }
  
  const isProtectedRoute = protectedRoutes.includes(path);
  const isPublicRoute = publicRoutes.includes(path);
  
  const cookie = request.cookies.get('session')?.value;
  let sessionPayload = null;

  if (cookie) {
    try {
      // Decode JWT without full verification if jose is heavy, but here we can just import decrypt or jwtVerify if possible
      // Actually, middleware can't import node modules sometimes if they are not edge compatible. 
      // But we can check if it's expired by decoding it manually.
      const payloadBase64 = cookie.split('.')[1];
      if (payloadBase64) {
        const decodedPayload = JSON.parse(atob(payloadBase64));
        if (decodedPayload.exp * 1000 > Date.now()) {
          sessionPayload = decodedPayload;
        }
      }
    } catch (e) {
      // invalid token
    }
  }

  if (isProtectedRoute && !sessionPayload) {
    const response = NextResponse.redirect(new URL('/login', request.nextUrl));
    response.cookies.delete('session');
    return response;
  }

  if (isPublicRoute && sessionPayload) {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  // Next.js handles CORS automatically via next.config.mjs headers
  const response = NextResponse.next();

  // Add CORS headers dynamically just in case next.config doesn't catch it or for dynamic origins
  const origin = request.headers.get('origin') ?? '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  // Add Strict Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Automatic Subdomain Tenant Resolution
  const host = request.headers.get('host') || '';
  if (host.includes('.intelligentdive.com')) {
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'erp') {
      const tenantSlug = parts[0];
      response.headers.set('x-tenant-slug', tenantSlug);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
