import 'next-auth';
import 'next-auth/jwt';
import '@auth/core/types';

declare module '@auth/core/types' {
  interface User {
    role?: 'admin' | 'viewer';
    authSource?: string;
  }
}

declare module 'next-auth' {
  interface User {
    role?: 'admin' | 'viewer';
    authSource?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'admin' | 'viewer';
    authSource?: string;
  }
}
