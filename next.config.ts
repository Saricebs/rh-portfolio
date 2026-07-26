import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

// Security headers are defined here ONLY. They used to be duplicated verbatim
// in vercel.json, which sent two Content-Security-Policy headers on Vercel —
// browsers then enforce the intersection of both, so the two copies had to stay
// byte-identical forever or the site would break in ways that never reproduce
// locally. vercel.json now carries no `headers` block.
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is only needed by the dev overlay / HMR. Shipping it in
  // production removes a meaningful layer of XSS defence for no benefit.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  'img-src \'self\' data: https: blob:',
  "font-src 'self'",
  [
    "connect-src 'self'",
    'https://rpc.mainnet.chain.robinhood.com',
    'https://robinhood-chain.drpc.org',
    'https://rpc.rhinofi.xyz/rh',
    'https://api.dexscreener.com',
    'https://api.coingecko.com',
  ].join(' '),
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join('; ')

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          ...(isDev ? [] : [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          }]),
        ],
      },
    ]
  },
}

export default nextConfig
