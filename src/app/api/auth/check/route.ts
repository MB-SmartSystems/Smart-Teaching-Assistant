import { NextRequest, NextResponse } from 'next/server'
import { validateSessionToken } from '@/lib/session'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  const authenticated = token ? validateSessionToken(token) : false
  return NextResponse.json({ authenticated })
}
