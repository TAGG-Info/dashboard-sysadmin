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

        const localUser = process.env.LOCAL_ADMIN_USERNAME?.trim();
        const localHash = process.env.LOCAL_ADMIN_PASSWORD_HASH?.trim();

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
          console.log('[auth] LDAP: user not found, trying local admin');
        } catch (err) {
          console.log('[auth] LDAP unavailable:', (err as Error).message, '→ trying local admin');
        }

        if (username === localUser && localHash && await bcrypt.compare(password, localHash)) {
          resetRateLimit(username);
          return { id: 'local-admin', name: username, role: 'admin', authSource: 'local' };
        }
        console.warn(`[auth] Login failed for "${username}" — localUser="${localUser}", hashLen=${localHash?.length ?? 0}, match=${username === localUser}`);
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
