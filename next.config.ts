/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack Konfiguration (leer um Fehler zu vermeiden)
  turbopack: {},
  
  // PWA später aktivieren, erstmal ohne
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
        ],
      },
    ]
  },
}

export default nextConfig