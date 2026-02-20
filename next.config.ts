/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack Konfiguration (leer um Fehler zu vermeiden)
  turbopack: {},

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://baserow.mb-smartsystems.de; frame-ancestors 'none';",
          },
        ],
      },
    ]
  },

  async rewrites() {
    return [
      // SECURITY: Block access to sensitive files
      {
        source: '/.env',
        destination: '/404',
      },
      {
        source: '/.env.local',
        destination: '/404',
      },
      {
        source: '/.env.production',
        destination: '/404',
      },
      {
        source: '/.env.development',
        destination: '/404',
      },
      {
        source: '/.git/:path*',
        destination: '/404',
      },
    ]
  },
}

export default nextConfig
