import { NextRequest, NextResponse } from 'next/server'

// Public auth routes that don't require a session
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/check']

async function validateTokenEdge(token: string, secret: string): Promise<boolean> {
  if (!token || !secret) return false

  const parts = token.split('.')
  if (parts.length !== 3) return false

  const [random, expiry, hmac] = parts
  if (!random || !expiry || !hmac) return false

  // Verify HMAC using Web Crypto API (Edge-compatible)
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const payload = `${random}.${expiry}`
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expectedHmac = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-length comparison
  if (hmac.length !== expectedHmac.length) return false
  let mismatch = 0
  for (let i = 0; i < hmac.length; i++) {
    mismatch |= hmac.charCodeAt(i) ^ expectedHmac.charCodeAt(i)
  }
  if (mismatch !== 0) return false

  // Check expiry
  const expiryMs = parseInt(expiry, 10)
  if (isNaN(expiryMs) || Date.now() > expiryMs) return false

  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public auth routes
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('session')?.value
  const secret = process.env.SESSION_SECRET

  if (!token || !secret || !(await validateTokenEdge(token, secret))) {
    return NextResponse.json(
      { error: 'Nicht authentifiziert' },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
