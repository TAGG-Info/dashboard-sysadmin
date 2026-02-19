import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { ALL_PAGE_PATHS } from '@/types/roles';
import { checkRateLimit, resetRateLimit } from './rate-limit';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { username, password } = credentials as {
          username: string;
          password: string;
        };

        const localUser = process.env.LOCAL_ADMIN_USERNAME?.trim();
        // Docker Compose expands $ in env values, breaking bcrypt hashes.
        // Accept base64-encoded hashes: if the value doesn't start with $2, decode from base64.
        let localHash = process.env.LOCAL_ADMIN_PASSWORD_HASH?.trim();
        if (localHash && !localHash.startsWith('$2')) {
          try {
            localHash = Buffer.from(localHash, 'base64').toString('utf-8');
          } catch {
            /* use as-is */
          }
        }

        if (!checkRateLimit(username)) {
          console.warn(`[auth] Rate limit dépassé pour: ${username}`);
          return null;
        }

        // These imports are Node.js-only (ldapjs, fs/promises).
        // Safe here because auth.ts is only imported by API routes (Node.js runtime),
        // NOT by middleware (which uses auth.config.ts instead).
        const { authenticateLDAP } = await import('./ldap');
        const { resolveRole } = await import('./roles');

        // LDAP (primary)
        try {
          const ldapUser = await authenticateLDAP(username, password);
          if (ldapUser) {
            resetRateLimit(username);
            const dashboardRole = await resolveRole(ldapUser.groups);
            return {
              id: ldapUser.username,
              name: ldapUser.displayName || ldapUser.username,
              email: ldapUser.email,
              role: dashboardRole.id,
              allowedPages: dashboardRole.pages,
              authSource: 'ldap',
            };
          }
          console.log('[auth] LDAP: user not found, trying local admin');
        } catch (err) {
          console.log('[auth] LDAP unavailable:', (err as Error).message, '→ trying local admin');
        }

        if (username === localUser && localHash && (await bcrypt.compare(password, localHash))) {
          resetRateLimit(username);
          return {
            id: 'local-admin',
            name: username,
            role: 'admin',
            allowedPages: [...ALL_PAGE_PATHS, '/settings'],
            authSource: 'local',
          };
        }
        console.warn(
          `[auth] Login failed for "${username}" — localUser="${localUser}", hashLen=${localHash?.length ?? 0}, match=${username === localUser}`,
        );
        return null;
      },
    }),
  ],
});
