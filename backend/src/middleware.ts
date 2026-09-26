import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/', '/invoices', '/settings'];
const publicRoutes = ['/login'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
