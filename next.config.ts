import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

if (process.env.ALLOW_SELF_SIGNED_CERTS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn(
    '[next.config] TLS certificate validation disabled globally (ALLOW_SELF_SIGNED_CERTS=true). Only use in trusted internal networks.',
  );
}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['ioredis', 'ldapjs', 'pino'],
};

export default withBundleAnalyzer(nextConfig);
