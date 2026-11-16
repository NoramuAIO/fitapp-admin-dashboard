import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAdminSessionToken, verifyUserToken } from '@/lib/auth';

const PUBLIC_API_ROUTES = [
  '/api/admin/login',
  '/api/admin/logout',
  '/api/auth/login',
  '/api/auth/register',
];

const ADMIN_ONLY_API_PREFIXES = [
  '/api/settings',
  '/api/export',
  '/api/import',
  '/api/programs/export',
  '/api/programs/import',
  '/api/users',
  '/api/notifications/test',
];

const ADMIN_WRITE_ONLY_PREFIXES = [
  '/api/programs',
  '/api/workouts',
  '/api/program-days',
  '/api/exercises',
  '/api/notifications/rules',
  '/api/athlete-ranks',
  '/api/widgets',
  '/api/user-programs',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  const adminCookie = request.cookies.get('admin-auth')?.value;
  const isAdmin = await verifyAdminSessionToken(adminCookie);

  // API route protection (default-deny except explicit public login/register routes)
  if (pathname.startsWith('/api')) {
    if (PUBLIC_API_ROUTES.some((route) => pathname === route)) {
      return NextResponse.next();
    }

    const authHeader = request.headers.get('authorization');
    const bearerToken =
      authHeader && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : null;
    const tokenUser = bearerToken ? await verifyUserToken(bearerToken) : null;

    if (!isAdmin && !tokenUser) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim (Oturum gerekli)' },
        { status: 401 }
      );
    }

    const isAdminOnlyPrefix = ADMIN_ONLY_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    const isAdminWriteRoute =
      request.method !== 'GET' &&
      ADMIN_WRITE_ONLY_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      );

    if ((isAdminOnlyPrefix || isAdminWriteRoute) && !isAdmin) {
      return NextResponse.json(
        { error: 'Bu işlem için admin yetkisi gereklidir' },
        { status: 403 }
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
    '/api/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
