import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login sayfası ve API route'ları hariç
  if (pathname === '/login' || pathname.startsWith('/api/admin/login')) {
    return NextResponse.next();
  }

  // Cookie kontrolü
  const authCookie = request.cookies.get('admin-auth');

  if (!authCookie || authCookie.value !== 'authenticated') {
    // Giriş yapmamış, login'e yönlendir
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
