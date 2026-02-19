import 'next-auth';
import 'next-auth/jwt';
import '@auth/core/types';

declare module '@auth/core/types' {
  interface User {
    role?: string;
    authSource?: string;
    allowedPages?: string[];
  }
}

declare module 'next-auth' {
  interface User {
    role?: string;
    authSource?: string;
    allowedPages?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    authSource?: string;
    allowedPages?: string[];
  }
}
