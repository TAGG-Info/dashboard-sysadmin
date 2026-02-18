import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authenticateLDAP, isAdmin } from './ldap';
import { checkRateLimit, resetRateLimit } from './rate-limit';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { username, password } = credentials as {
          username: string; password: string;
        };

        const localUser = process.env.LOCAL_ADMIN_USERNAME;
        const localHash = process.env.LOCAL_ADMIN_PASSWORD_HASH;

        if (!checkRateLimit(username)) {
          console.warn(`[auth] Rate limit dépassé pour: ${username}`);
          return null;
        }

        // LDAP (primary)
        try {
          const ldapUser = await authenticateLDAP(username, password);
          if (ldapUser) {
            resetRateLimit(username);
            return {
              id: ldapUser.username,
              name: ldapUser.displayName || ldapUser.username,
              email: ldapUser.email,
              role: isAdmin(ldapUser.groups) ? 'admin' : 'viewer',
              authSource: 'ldap',
            };
          }
          // LDAP up but user not found → try local admin (username must match exactly)
        } catch {
          // LDAP down → try local admin
        }

        if (username === localUser && localHash && await bcrypt.compare(password, localHash)) {
          resetRateLimit(username);
          return { id: 'local-admin', name: username, role: 'admin', authSource: 'local' };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.authSource = user.authSource;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.authSource = token.authSource;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8h
});
