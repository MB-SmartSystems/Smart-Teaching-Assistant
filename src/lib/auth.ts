// Server-side cookie-based authentication via /api/auth/* endpoints
// No localStorage, no client-side secrets

export async function authenticate(password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) return false
    const data = await res.json()
    return data.authenticated === true
  } catch {
    return false
  }
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/check')
    if (!res.ok) return false
    const data = await res.json()
    return data.authenticated === true
  } catch {
    return false
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // Cookie will expire on its own
  }
}

// No-op: session is managed server-side via cookies
export function refreshSession(): void {}
