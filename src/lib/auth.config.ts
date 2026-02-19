import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe NextAuth config — no Node.js-only imports.
 * Used by middleware (Edge Runtime) for JWT verification.
 * The full auth (with providers) is in auth.ts (Node.js only).
 */
export const authConfig = {
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.allowedPages = user.allowedPages;
        token.authSource = user.authSource;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.allowedPages = token.allowedPages;
        session.user.authSource = token.authSource;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8h
} satisfies NextAuthConfig;
