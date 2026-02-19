'use client'

import { SchülerApp } from '@/lib/baserow'

interface RevenueGapProps {
  students: SchülerApp[]
}

export default function RevenueGap({ students }: RevenueGapProps) {
  // IST-Einnahmen aus aktiven Schülern berechnen
  const activeStudents = students.filter(s => {
    const status = s.anfrageStatus?.toLowerCase() || ''
    return status === 'aktiver schüler' || status === ''
  })

  const istMonatlich = activeStudents.reduce((sum, s) => {
    const betrag = parseFloat(s.monatlicherbetrag || '0')
    return sum + (isNaN(betrag) ? 0 : betrag)
  }, 0)

  const zielMonatlich = 3200
  const gap = zielMonatlich - istMonatlich
  const progressPercent = Math.min((istMonatlich / zielMonatlich) * 100, 100)
  const isReached = istMonatlich >= zielMonatlich

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        Umsatz-Ziel
      </h2>

      <div className="rounded-lg p-5" style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)',
      }}>
        {/* Hauptzahlen */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>IST monatlich</div>
            <div className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>
              {istMonatlich.toFixed(0)}€
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>ZIEL Netto</div>
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {zielMonatlich.toFixed(0)}€
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-3">
          <div className="w-full rounded-full h-5" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div
              className="h-5 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: isReached ? 'var(--status-success)' : 'var(--primary)',
              }}
            >
              <span className="text-xs font-bold" style={{ color: 'var(--bg-primary)' }}>
                {progressPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Gap-Anzeige */}
        {!isReached && (
          <div className="rounded-lg p-3 flex justify-between items-center" style={{
            backgroundColor: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Fehlbetrag zum Ziel
            </span>
            <span className="text-xl font-bold" style={{ color: 'var(--status-error)' }}>
              -{gap.toFixed(0)}€
            </span>
          </div>
        )}

        {isReached && (
          <div className="rounded-lg p-3 text-center" style={{
            backgroundColor: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
          }}>
            <span className="text-sm font-bold" style={{ color: 'var(--status-success)' }}>
              Ziel erreicht!
            </span>
          </div>
        )}

        {/* Info */}
        <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {activeStudents.length} aktive Schüler &middot; Durchschnitt {activeStudents.length > 0 ? (istMonatlich / activeStudents.length).toFixed(0) : 0}€/Schüler
        </div>
      </div>
    </div>
  )
}
