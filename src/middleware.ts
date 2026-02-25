import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

// Lightweight auth for middleware (Edge Runtime) — JWT verification only, no Node.js deps.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuth = !!req.auth;
  const isLoginPage = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth');
  const isHealthCheck = pathname === '/api/health';
  const isStaticAsset = pathname.startsWith('/_next') || pathname === '/favicon.ico';

  if (isAuthApi || isHealthCheck || isStaticAsset) return NextResponse.next();

  if (!isAuth && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAuth && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Protection CSRF : vérifier l'origine pour les requêtes mutantes sur /api/settings.
  // Volontairement limité aux settings (seules routes mutantes de l'app).
  // Si de nouvelles routes mutantes (/api/actions, etc.) sont ajoutées, étendre ce check.
  // Note: si origin est absent (clients non-navigateur), la requête passe — acceptable
  // car toutes les routes sont aussi protégées par JWT session cookie (SameSite).
  if (pathname.startsWith('/api/settings') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  if (pathname.startsWith('/settings') || pathname.startsWith('/api/settings')) {
    const role = req.auth?.user?.role;
    if (role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Page-level authorization based on allowedPages from role
  if (isAuth && !pathname.startsWith('/api/')) {
    const role = req.auth?.user?.role;
    const allowedPages = req.auth?.user?.allowedPages;

    // Admin bypasses page checks
    if (role !== 'admin' && allowedPages) {
      // Check dashboard pages (exact match for /, startsWith for others)
      const isProtectedPage =
        pathname === '/' ||
        ['/monitoring', '/infrastructure', '/backups', '/transfers', '/tickets'].some((p) => pathname.startsWith(p));

      if (isProtectedPage) {
        const pageMatch =
          pathname === '/' ? allowedPages.includes('/') : allowedPages.some((p) => pathname.startsWith(p));

        if (!pageMatch) {
          // Redirect to the first allowed page, or / as ultimate fallback
          const firstAllowed = allowedPages.find((p) => p !== '/settings') || '/';
          return NextResponse.redirect(new URL(firstAllowed, req.url));
        }
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
