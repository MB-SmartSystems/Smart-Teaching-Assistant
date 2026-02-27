'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from './Toast'

interface Aufgabe {
  id: number
  Aufgabe_ID: number
  Titel: string
  Beschreibung: string
  Typ: { id: number; value: string; color: string } | null
  Priorität: { id: number; value: string; color: string } | null
  Status: { id: number; value: string; color: string } | null
  Erstellt_am: string
  Erledigt_am: string
  Fällig_am: string
  Verknüpfung_Schueler: { id: number; value: string }[]
  Notizen: string
}

// Typ-Icons
const TYP_ICONS: Record<string, string> = {
  'Probeunterricht Termin': '📅',
  'Follow-Up Probeunterricht': '🔄',
  'Mit Eltern absprechen': '👨‍👩‍👦',
  'Schlagzeugwahl klären': '🥁',
  'Flex-Karte buchen': '🎫',
  'Unterricht eintragen': '📝',
  'Manuell': '✏️',
}

// Priorität-Farben
const PRIO_COLORS: Record<string, string> = {
  'Hoch': '#ef4444',
  'Mittel': '#f59e0b',
  'Niedrig': '#6b7280',
}

export default function AufgabenWidget() {
  const toast = useToast()
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showErledigt, setShowErledigt] = useState(false)
  const [terminForm, setTerminForm] = useState<{ aufgabeId: number; datum: string; uhrzeit: string } | null>(null)

  const loadAufgaben = useCallback(async () => {
    try {
      const res = await fetch('/api/aufgaben')
      if (!res.ok) return
      const data = await res.json()
      setAufgaben(data)
    } catch (err) {
      console.error('Fehler beim Laden der Aufgaben:', err)
    }
  }, [])

  useEffect(() => {
    loadAufgaben()
  }, [loadAufgaben])

  // Reload when modal opens
  useEffect(() => {
    if (isOpen) loadAufgaben()
  }, [isOpen, loadAufgaben])

  const offeneAufgaben = aufgaben.filter(a =>
    a.Status?.value === 'Offen' || a.Status?.value === 'In Arbeit'
  ).sort((a, b) => {
    // Sortierung: Hoch > Mittel > Niedrig
    const prioOrder: Record<string, number> = { 'Hoch': 0, 'Mittel': 1, 'Niedrig': 2 }
    const prioA = prioOrder[a.Priorität?.value || 'Niedrig'] ?? 2
    const prioB = prioOrder[b.Priorität?.value || 'Niedrig'] ?? 2
    return prioA - prioB
  })

  const erledigteAufgaben = aufgaben.filter(a => a.Status?.value === 'Erledigt')

  // Aufgabe als Erledigt markieren
  const handleErledigt = async (aufgabe: Aufgabe) => {
    setLoading(true)
    try {
      const res = await fetch('/api/aufgaben', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aufgabeId: aufgabe.id,
          updates: {
            Status: 3861, // Erledigt
            Erledigt_am: new Date().toISOString().split('T')[0],
          }
        })
      })
      if (res.ok) {
        toast.success(`Aufgabe "${aufgabe.Titel}" erledigt!`)
        await loadAufgaben()
      }
    } catch (err) {
      toast.error('Fehler beim Aktualisieren')
    } finally {
      setLoading(false)
    }
  }

  // Probeunterricht-Termin eintragen
  const handleTerminEintragen = async () => {
    if (!terminForm) return
    const { aufgabeId, datum, uhrzeit } = terminForm
    if (!datum) {
      toast.error('Bitte Datum eingeben')
      return
    }

    setLoading(true)
    try {
      const aufgabe = aufgaben.find(a => a.id === aufgabeId)
      const schuelerId = aufgabe?.Verknüpfung_Schueler?.[0]?.id

      // 1. Schüler-Daten aktualisieren (Probeunterricht-Felder)
      if (schuelerId) {
        await fetch('/api/students', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: schuelerId,
            fieldName: 'field_7846',
            value: datum,
          })
        })
        if (uhrzeit) {
          await fetch('/api/students', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: schuelerId,
              fieldName: 'field_7847',
              value: uhrzeit,
            })
          })
        }
      }

      // 2. Aufgabe als Erledigt markieren
      await fetch('/api/aufgaben', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aufgabeId,
          updates: {
            Status: 3861,
            Erledigt_am: new Date().toISOString().split('T')[0],
          }
        })
      })

      toast.success('Termin eingetragen und Aufgabe erledigt!')
      setTerminForm(null)
      await loadAufgaben()
    } catch (err) {
      toast.error('Fehler beim Eintragen des Termins')
    } finally {
      setLoading(false)
    }
  }

  const badgeCount = offeneAufgaben.length

  return (
    <>
      {/* Badge Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative btn-primary text-sm"
        title="Aufgaben anzeigen"
      >
        📋 Aufgaben
        {badgeCount > 0 && (
          <span
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
            style={{ backgroundColor: '#ef4444' }}
          >
            {badgeCount}
          </span>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-light)' }}>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Aufgaben ({offeneAufgaben.length} offen)
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-2xl leading-none px-2"
                style={{ color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-5 space-y-3" style={{ maxHeight: 'calc(85vh - 80px)' }}>
              {/* Offene Aufgaben */}
              {offeneAufgaben.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  Keine offenen Aufgaben
                </div>
              ) : (
                offeneAufgaben.map(aufgabe => (
                  <div
                    key={aufgabe.id}
                    className="rounded-lg border p-4"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-light)',
                      borderLeft: `4px solid ${PRIO_COLORS[aufgabe.Priorität?.value || 'Niedrig'] || '#6b7280'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{TYP_ICONS[aufgabe.Typ?.value || ''] || '📌'}</span>
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {aufgabe.Titel}
                          </span>
                        </div>
                        {aufgabe.Verknüpfung_Schueler?.[0] && (
                          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Schüler: {aufgabe.Verknüpfung_Schueler[0].value}
                          </div>
                        )}
                        {aufgabe.Fällig_am && (
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            Fällig: {new Date(aufgabe.Fällig_am).toLocaleDateString('de-DE')}
                          </div>
                        )}
                        {aufgabe.Beschreibung && (
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {aufgabe.Beschreibung}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        {/* Probeunterricht-Termin eintragen Button */}
                        {aufgabe.Typ?.value === 'Probeunterricht Termin' && aufgabe.Verknüpfung_Schueler?.[0] && (
                          <button
                            onClick={() => setTerminForm({
                              aufgabeId: aufgabe.id,
                              datum: '',
                              uhrzeit: '',
                            })}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                            style={{ backgroundColor: '#3b82f6' }}
                          >
                            Termin eintragen
                          </button>
                        )}
                        <button
                          onClick={() => handleErledigt(aufgabe)}
                          disabled={loading}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                          style={{ backgroundColor: '#10b981' }}
                        >
                          Erledigt
                        </button>
                      </div>
                    </div>

                    {/* Inline Termin-Form */}
                    {terminForm?.aufgabeId === aufgabe.id && (
                      <div className="mt-3 pt-3 border-t flex items-end gap-3 flex-wrap" style={{ borderColor: 'var(--border-light)' }}>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Datum</label>
                          <input
                            type="date"
                            value={terminForm.datum}
                            onChange={e => setTerminForm(prev => prev ? { ...prev, datum: e.target.value } : null)}
                            className="px-2 py-1.5 rounded border text-sm"
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Uhrzeit</label>
                          <input
                            type="time"
                            value={terminForm.uhrzeit}
                            onChange={e => setTerminForm(prev => prev ? { ...prev, uhrzeit: e.target.value } : null)}
                            className="px-2 py-1.5 rounded border text-sm"
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <button
                          onClick={handleTerminEintragen}
                          disabled={loading || !terminForm.datum}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                          style={{ backgroundColor: loading ? 'var(--border-medium)' : '#3b82f6' }}
                        >
                          {loading ? 'Speichern...' : 'Speichern'}
                        </button>
                        <button
                          onClick={() => setTerminForm(null)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Abbrechen
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Erledigte Aufgaben - Collapsible */}
              {erledigteAufgaben.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowErledigt(!showErledigt)}
                    className="text-sm font-medium flex items-center gap-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>{showErledigt ? '▼' : '▶'}</span>
                    Erledigt ({erledigteAufgaben.length})
                  </button>
                  {showErledigt && (
                    <div className="mt-2 space-y-2">
                      {erledigteAufgaben.map(aufgabe => (
                        <div
                          key={aufgabe.id}
                          className="rounded-lg border p-3 opacity-60"
                          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm line-through" style={{ color: 'var(--text-muted)' }}>
                              {TYP_ICONS[aufgabe.Typ?.value || ''] || '📌'} {aufgabe.Titel}
                            </span>
                            {aufgabe.Erledigt_am && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                ({new Date(aufgabe.Erledigt_am).toLocaleDateString('de-DE')})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
