import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAdminSessionToken } from '@/lib/auth';

const PUBLIC_API_ROUTES = [
  '/api/admin/login',
  '/api/admin/logout',
  '/api/auth/login',
  '/api/auth/register',
];

const ADMIN_ONLY_API_PREFIXES = [
  '/api/settings/delete-sessions',
  '/api/settings/delete-progress',
  '/api/export',
  '/api/import',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  const adminCookie = request.cookies.get('admin-auth')?.value;
  const isAdmin = await verifyAdminSessionToken(adminCookie);

  // API route protection
  if (pathname.startsWith('/api')) {
    if (PUBLIC_API_ROUTES.some((route) => pathname === route)) {
      return NextResponse.next();
    }

    const requiresAdmin =
      ADMIN_ONLY_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
      (pathname.startsWith('/api/users') &&
        (request.method === 'DELETE' || request.method === 'POST'));

    if (requiresAdmin && !isAdmin) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim (Admin oturumu gerekli)' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // UI route protection
  if (pathname === '/login') {
    if (isAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!isAdmin) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Admin panel sayfaları ve API rotalarını koru
     * Static dosyalar hariç
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
