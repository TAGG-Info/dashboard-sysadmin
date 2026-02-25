import * as ldap from 'ldapjs';

interface LDAPUser {
  username: string;
  displayName: string;
  email: string;
  groups: string[];
}

/** Escape special characters in LDAP filter values (RFC 4515) */
function escapeLDAPFilter(value: string): string {
  return value
    .replace(/\\/g, '\\5c')
    .replace(/\*/g, '\\2a')
    .replace(/\(/g, '\\28')
    .replace(/\)/g, '\\29')
    .replace(/\0/g, '\\00');
}

export async function authenticateLDAP(username: string, password: string): Promise<LDAPUser | null> {
  const ldapUrl = process.env.LDAP_URL?.trim();
  const baseDN = process.env.LDAP_BASE_DN?.trim();
  const bindDN = process.env.LDAP_BIND_DN?.trim();
  const bindPassword = process.env.LDAP_BIND_PASSWORD?.trim();
  const searchFilter = (process.env.LDAP_USER_SEARCH_FILTER || '(sAMAccountName={{username}})').replace(
    '{{username}}',
    escapeLDAPFilter(username),
  );

  if (!ldapUrl || !baseDN || !bindDN || !bindPassword) {
    throw new Error('LDAP configuration incomplete');
  }

  // TLS cert verification is enforced by default. Set LDAP_TLS_REJECT_UNAUTHORIZED=false in .env.local to opt-out (not recommended).
  const rejectUnauthorized = process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false';

  return new Promise((resolve, reject) => {
    const client = ldap.createClient({
      url: ldapUrl,
      tlsOptions: { rejectUnauthorized },
      connectTimeout: 5000,
      timeout: 5000,
    });

    client.on('error', (err: Error) => {
      reject(err);
    });

    // 1. Bind with the service account
    client.bind(bindDN, bindPassword, (err) => {
      if (err) {
        client.unbind();
        reject(err);
        return;
      }

      // 2. Search for the user
      const searchOptions: ldap.SearchOptions = {
        filter: searchFilter,
        scope: 'sub',
        attributes: ['dn', 'sAMAccountName', 'displayName', 'mail', 'memberOf'],
      };

      client.search(baseDN, searchOptions, (err, res) => {
        if (err) {
          client.unbind();
          reject(err);
          return;
        }

        let userEntry: ldap.SearchEntry | null = null;

        res.on('searchEntry', (entry: ldap.SearchEntry) => {
          userEntry = entry;
        });
        res.on('error', (err: Error) => {
          client.unbind();
          reject(err);
        });
        res.on('end', () => {
          if (!userEntry) {
            client.unbind();
            resolve(null);
            return;
          }

          // ldapjs v3: SearchEntry.dn is a DN object, not a string — must convert
          const userDN = userEntry.dn.toString();

          // 3. Bind with user credentials to verify the password
          client.bind(userDN, password, (err) => {
            if (err) {
              client.unbind();
              resolve(null);
              return;
            }

            // ldapjs v3: SearchEntry.attributes is Attribute[]
            // Each Attribute has `.type` (string) and `.values` (string | string[])
            const getAttribute = (name: string): string => {
              const attr = userEntry!.attributes.find((a: ldap.Attribute) => a.type === name);
              if (!attr) return '';
              const vals = attr.values;
              return Array.isArray(vals) ? vals[0] || '' : vals || '';
            };

            const getAttributeValues = (name: string): string[] => {
              const attr = userEntry!.attributes.find((a: ldap.Attribute) => a.type === name);
              if (!attr) return [];
              const vals = attr.values;
              return Array.isArray(vals) ? vals : [vals];
            };

            const user: LDAPUser = {
              username: getAttribute('sAMAccountName') || username,
              displayName: getAttribute('displayName') || username,
              email: getAttribute('mail') || '',
              groups: getAttributeValues('memberOf'),
            };

            client.unbind();
            resolve(user);
          });
        });
      });
    });
  });
}
