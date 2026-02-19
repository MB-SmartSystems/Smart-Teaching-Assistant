'use client'

import { useEffect, useState } from 'react'
import { Preiserhoehung, fetchPreiserhoehungen, getSchuelerName, getStatusColor, getTotalDifferenz } from '@/lib/preiserhoehungen'

export default function PreiserhoehungsDashboard() {
  const [items, setItems] = useState<Preiserhoehung[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPreiserhoehungen().then(data => {
      setItems(data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Preiserhöhungen
        </h2>
        <div className="rounded-lg p-6 text-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Laden...</div>
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  const totalDiff = getTotalDifferenz(items)
  const umgesetzt = items.filter(i => i.Status?.value === 'Umgesetzt' || i.Status?.value === 'Akzeptiert').length
  const offen = items.length - umgesetzt

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        Preiserhöhungen
      </h2>

      {/* Zusammenfassung */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <div className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
            +{totalDiff.toFixed(0)}€
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Potenzial /Monat</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <div className="text-xl font-bold" style={{ color: 'var(--status-warning)' }}>
            {offen}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Offen</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <div className="text-xl font-bold" style={{ color: 'var(--status-success)' }}>
            {umgesetzt}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Umgesetzt</div>
        </div>
      </div>

      {/* Einzelne Kampagnen */}
      <div className="grid gap-3">
        {items.map(pe => {
          const statusText = pe.Status?.value || 'Unbekannt'
          const statusColor = getStatusColor(statusText)

          return (
            <div
              key={pe.id}
              className="rounded-lg p-4 border-l-4"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                borderLeftColor: statusColor,
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {getSchuelerName(pe)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                      backgroundColor: `${statusColor}22`,
                      color: statusColor,
                    }}>
                      {statusText}
                    </span>
                  </div>

                  <div className="flex gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span>{pe.Aktueller_Preis_EUR}€ &rarr; {pe.Neuer_Preis_EUR}€</span>
                    <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                      +{pe.Differenz_EUR}€
                    </span>
                  </div>

                  {pe.Umsetzung_ab_Datum && (
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Umsetzung ab: {new Date(pe.Umsetzung_ab_Datum).toLocaleDateString('de-DE')}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {pe.ID}
                  </div>
                </div>
              </div>

              {/* Notizen */}
              {pe.Notizen && (
                <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {pe.Notizen}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
