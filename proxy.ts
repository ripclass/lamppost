import { NextResponse, type NextRequest } from 'next/server';
import { readProxySession } from '@/lib/auth/proxy-session';
import { isAdminRole } from '@/lib/auth/roles';

/**
 * Next.js 16 proxy — route-tree guards:
 *   /admin/*  → must be signed in with an admin role (else → /app or /)
 *   /app/*    → must be signed in (else → /)
 *   everything else (marketing, onboarding, /api/*, static) → public
 *
 * Refreshes the Supabase auth cookie on every request via `readProxySession`.
 * The response returned carries refreshed cookies back to the browser — do
 * not replace it with a bare NextResponse.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|webp|css|js|map|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  const isAdminPath = pathname.startsWith('/admin');
  const isAppPath =
    pathname === '/app' || pathname.startsWith('/app/') || pathname === '/app/';

  if (!isAdminPath && !isAppPath) return response;

  const { authId, role } = await readProxySession(request, response);

  if (!authId) {
    const redirectTo = new URL('/', request.url);
    redirectTo.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectTo);
  }

  if (isAdminPath && (!role || !isAdminRole(role))) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return response;
}

export const proxyConfig = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
