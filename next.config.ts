import type { NextConfig } from "next";

// Allow self-signed certificates for internal infrastructure APIs.
// Set ALLOW_SELF_SIGNED_CERTS=true in .env.local if your infrastructure uses self-signed certs.
if (process.env.ALLOW_SELF_SIGNED_CERTS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['ioredis', 'ldapjs'],
};

export default nextConfig;
