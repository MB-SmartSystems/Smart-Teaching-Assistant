// Einfache Client-Side Authentifizierung für die Teaching App
// Für Produktionsumgebung sollte das durch echte Server-Side Auth ersetzt werden

const AUTH_KEY = 'teaching-app-auth'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 Stunden

interface AuthSession {
  authenticated: boolean
  timestamp: number
}

// Passwort-Hash (einfach für Demo - in Produktion sollte das server-seitig validiert werden)
const VALID_PASSWORD_HASH = process.env.NEXT_PUBLIC_APP_PASSWORD || 'unterricht2024'

export class AuthManager {
  private static instance: AuthManager
  private session: AuthSession | null = null

  private constructor() {
    this.loadSession()
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  // Session aus localStorage laden
  private loadSession(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(AUTH_KEY)
      if (stored) {
        const session: AuthSession = JSON.parse(stored)
        
        // Prüfen ob Session noch gültig ist
        const now = Date.now()
        if (now - session.timestamp < SESSION_DURATION) {
          this.session = session
        } else {
          // Session abgelaufen
          localStorage.removeItem(AUTH_KEY)
        }
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Auth-Session:', error)
      localStorage.removeItem(AUTH_KEY)
    }
  }

  // Session speichern
  private saveSession(session: AuthSession): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(session))
      this.session = session
    } catch (error) {
      console.error('Fehler beim Speichern der Auth-Session:', error)
    }
  }

  // Anmeldung versuchen
  authenticate(password: string): boolean {
    if (password === VALID_PASSWORD_HASH) {
      const session: AuthSession = {
        authenticated: true,
        timestamp: Date.now()
      }
      this.saveSession(session)
      return true
    }
    return false
  }

  // Abmeldung
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_KEY)
    }
    this.session = null
  }

  // Prüfen ob angemeldet
  isAuthenticated(): boolean {
    if (!this.session) return false

    const now = Date.now()
    if (now - this.session.timestamp >= SESSION_DURATION) {
      this.logout()
      return false
    }

    return this.session.authenticated
  }

  // Session verlängern
  refreshSession(): void {
    if (this.session && this.session.authenticated) {
      this.session.timestamp = Date.now()
      this.saveSession(this.session)
    }
  }
}

// Hook für React Components
export function useAuth() {
  const auth = AuthManager.getInstance()
  
  return {
    isAuthenticated: auth.isAuthenticated.bind(auth),
    authenticate: auth.authenticate.bind(auth),
    logout: auth.logout.bind(auth),
    refreshSession: auth.refreshSession.bind(auth)
  }
}