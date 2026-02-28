import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login sayfası hariç
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Cookie kontrolü
  const authCookie = request.cookies.get('admin-auth');

  if (!authCookie || authCookie.value !== 'authenticated') {
    // Giriş yapmamış, login'e yönlendir
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Sadece admin panel sayfalarını koru
     * API route'ları ve static dosyalar hariç
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
