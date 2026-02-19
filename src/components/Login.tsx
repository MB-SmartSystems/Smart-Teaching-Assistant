'use client'

import { useState } from 'react'

interface LoginProps {
  onLogin: (password: string) => Promise<void> | void
  error?: string
}

export default function Login({ onLogin, error }: LoginProps) {
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setIsLoading(true)
    try {
      await onLogin(password)
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="p-8 rounded-lg shadow-lg border max-w-md w-full mx-4" style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderColor: 'var(--border-light)' 
      }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Smart Teaching Assistant
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Melde dich an um fortzufahren
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg font-medium focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ 
                borderColor: error ? 'var(--status-error)' : 'var(--border-medium)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--primary)'
              } as React.CSSProperties}
              placeholder="Passwort eingeben"
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="btn-primary w-full"
            style={{
              opacity: isLoading || !password.trim() ? 0.5 : 1,
              cursor: isLoading || !password.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Anmeldung läuft...
              </div>
            ) : (
              'Anmelden'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            © Manuel Büttner - Schlagzeugunterricht
          </p>
        </div>
      </div>
    </div>
  )
}