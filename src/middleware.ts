import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuth = !!req.auth;
  const isLoginPage = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth');
  const isStaticAsset = pathname.startsWith('/_next') || pathname === '/favicon.ico';

  if (isAuthApi || isStaticAsset) return NextResponse.next();

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
  if (
    pathname.startsWith('/api/settings') &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)
  ) {
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

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
