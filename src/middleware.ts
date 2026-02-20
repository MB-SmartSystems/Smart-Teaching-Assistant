import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // SECURITY: Block access to sensitive files
  const blockedPaths = [
    '/.env',
    '/.env.local', 
    '/.env.production',
    '/.env.development',
  ];

  const blockedPrefixes = [
    '/.git/',
    '/.git',
  ];

  // Check exact matches
  if (blockedPaths.includes(pathname)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Check path prefixes
  if (blockedPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/.env',
    '/.env.local',
    '/.env.production', 
    '/.env.development',
    '/.git/:path*',
  ]
}