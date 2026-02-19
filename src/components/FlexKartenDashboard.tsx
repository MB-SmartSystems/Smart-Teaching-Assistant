'use client'

import { useEffect, useState, useCallback } from 'react'
import { FlexKarte, fetchFlexKarten, getRestStunden, getKontingent, getVerbraucht, isLowBalance, isExpired, getSchuelerName } from '@/lib/flexKarten'
import { Unterrichtseinheit, fetchUnterrichtseinheiten, createUnterrichtseinheit, updateFlexKarteStunden, formatDauer, getFortschrittStars, FORTSCHRITT_OPTIONS } from '@/lib/unterrichtseinheiten'

export default function FlexKartenDashboard() {
  const [karten, setKarten] = useState<FlexKarte[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKarte, setSelectedKarte] = useState<FlexKarte | null>(null)
  const [einheiten, setEinheiten] = useState<Unterrichtseinheit[]>([])
  const [einheitenLoading, setEinheitenLoading] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Formular-State
  const [formDatum, setFormDatum] = useState(new Date().toISOString().split('T')[0])
  const [formUhrzeit, setFormUhrzeit] = useState('')
  const [formDauer, setFormDauer] = useState('1')
  const [formInhalte, setFormInhalte] = useState('')
  const [formFortschritt, setFormFortschritt] = useState(0)
  const [formNotizen, setFormNotizen] = useState('')

  useEffect(() => {
    fetchFlexKarten().then(data => {
      setKarten(data)
      setLoading(false)
    })
  }, [])

  // Einheiten laden wenn Karte ausgewählt
  const loadEinheiten = useCallback(async (karte: FlexKarte) => {
    setEinheitenLoading(true)
    const data = await fetchUnterrichtseinheiten(karte.id)
    // Nach Datum absteigend sortieren
    data.sort((a, b) => (b.Datum || '').localeCompare(a.Datum || ''))
    setEinheiten(data)
    setEinheitenLoading(false)
  }, [])

  const handleSelectKarte = (karte: FlexKarte) => {
    if (selectedKarte?.id === karte.id) {
      setSelectedKarte(null)
      setEinheiten([])
      setShowForm(false)
    } else {
      setSelectedKarte(karte)
      loadEinheiten(karte)
      setShowForm(false)
    }
  }

  const resetForm = () => {
    setFormDatum(new Date().toISOString().split('T')[0])
    setFormUhrzeit('')
    setFormDauer('1')
    setFormInhalte('')
    setFormFortschritt(0)
    setFormNotizen('')
  }

  const handleSaveEinheit = async () => {
    if (!selectedKarte || saving) return

    const dauer = parseFloat(formDauer)
    if (isNaN(dauer) || dauer <= 0) return

    setSaving(true)

    // 1. Neue Einheit erstellen
    const schuelerId = selectedKarte.Schueler_Link?.[0]?.id
    const result = await createUnterrichtseinheit({
      datum: formDatum,
      uhrzeit: formUhrzeit || undefined,
      dauer: formDauer,
      unterrichtsinhalte: formInhalte || undefined,
      fortschritt: formFortschritt > 0 ? (FORTSCHRITT_OPTIONS as Record<number, { id: number }>)[formFortschritt]?.id : undefined,
      notizen: formNotizen || undefined,
      schueler_id: schuelerId,
      flexkarte_id: selectedKarte.id,
    })

    if (result) {
      // 2. Verbrauchte Stunden auf Flex-Karte aktualisieren
      const bisherVerbraucht = getVerbraucht(selectedKarte)
      const kontingent = getKontingent(selectedKarte)
      const neueVerbrauchte = bisherVerbraucht + dauer
      const neueRest = Math.max(0, kontingent - neueVerbrauchte)

      await updateFlexKarteStunden(selectedKarte.id, neueVerbrauchte, neueRest)

      // 3. Lokalen State aktualisieren
      setKarten(prev => prev.map(k =>
        k.id === selectedKarte.id
          ? { ...k, Verbrauchte_Stunden: neueVerbrauchte.toFixed(2), Rest_Stunden: neueRest.toFixed(2) }
          : k
      ))
      setSelectedKarte(prev => prev ? { ...prev, Verbrauchte_Stunden: neueVerbrauchte.toFixed(2), Rest_Stunden: neueRest.toFixed(2) } : null)

      // 4. Einheiten neu laden
      await loadEinheiten(selectedKarte)

      resetForm()
      setShowForm(false)
    }

    setSaving(false)
  }

  // Statistiken berechnen
  const activeKarten = karten.filter(k => k.Status?.value === 'Aktiv')
  const totalEinnahmen = karten
    .filter(k => k.Bezahlt?.value === 'Ja')
    .reduce((sum, k) => sum + parseFloat(k.Preis_EUR || '0'), 0)
  const avgRest = activeKarten.length > 0
    ? activeKarten.reduce((sum, k) => sum + getRestStunden(k), 0) / activeKarten.length
    : 0

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Flex-Karten
        </h2>
        <div className="rounded-lg p-6 text-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Laden...</div>
        </div>
      </div>
    )
  }

  if (karten.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Flex-Karten
        </h2>
        <div className="rounded-lg p-6 text-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Keine Flex-Karten vorhanden</div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        Flex-Karten
      </h2>

      {/* Bereich B: Statistik-Akkordeon */}
      <div className="mb-4 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full flex justify-between items-center p-4 text-left transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <span className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
            Statistiken
          </span>
          <span style={{ color: 'var(--text-muted)' }}>{showStats ? '▲' : '▼'}</span>
        </button>

        {showStats && (
          <div className="grid grid-cols-3 gap-4 p-4" style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-light)' }}>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
              <div className="text-xl font-bold" style={{ color: 'var(--status-success)' }}>
                {totalEinnahmen.toFixed(0)}€
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Einnahmen (bezahlt)</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
              <div className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                {activeKarten.length}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Aktive Karten</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
              <div className="text-xl font-bold" style={{ color: avgRest < 3 ? 'var(--status-warning)' : 'var(--primary)' }}>
                {avgRest.toFixed(1)}h
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Durchschn. Rest</div>
            </div>
          </div>
        )}
      </div>

      {/* Bereich A: Karten-Übersicht */}
      <div className="grid gap-3">
        {karten.map(karte => {
          const rest = getRestStunden(karte)
          const kontingent = getKontingent(karte)
          const verbraucht = getVerbraucht(karte)
          const lowBalance = isLowBalance(karte)
          const expired = isExpired(karte)
          const progressPercent = kontingent > 0 ? (verbraucht / kontingent) * 100 : 0
          const isSelected = selectedKarte?.id === karte.id

          return (
            <div key={karte.id}>
              {/* Karten-Zeile */}
              <button
                onClick={() => handleSelectKarte(karte)}
                className="w-full text-left rounded-lg p-4 border-l-4 transition-all"
                style={{
                  backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderLeftColor: lowBalance ? 'var(--status-error)' : expired ? 'var(--status-warning)' : 'var(--primary)',
                  borderLeftWidth: '4px',
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {getSchuelerName(karte)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-muted)',
                    }}>
                      {karte.Karten_Typ?.value || 'Flex'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Badges */}
                    {lowBalance && !expired && (
                      <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{
                        backgroundColor: 'rgba(239,68,68,0.15)',
                        color: 'var(--status-error)',
                      }}>Nachkauf</span>
                    )}
                    {expired && (
                      <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{
                        backgroundColor: 'rgba(245,158,11,0.15)',
                        color: 'var(--status-warning)',
                      }}>Abgelaufen</span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{
                      backgroundColor: karte.Bezahlt?.value === 'Ja' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: karte.Bezahlt?.value === 'Ja' ? 'var(--status-success)' : 'var(--status-error)',
                    }}>
                      {karte.Bezahlt?.value === 'Ja' ? 'Bezahlt' : 'Offen'}
                    </span>

                    {/* Rest-Stunden */}
                    <span className="text-lg font-bold ml-2" style={{
                      color: lowBalance ? 'var(--status-error)' : 'var(--primary)',
                    }}>
                      {rest}h
                    </span>
                  </div>
                </div>

                {/* Fortschrittsbalken */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-full h-2" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(progressPercent, 100)}%`,
                        backgroundColor: lowBalance ? 'var(--status-error)' : 'var(--primary)',
                      }}
                    />
                  </div>
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {verbraucht}/{kontingent}h
                  </span>
                </div>

                {/* Kompakte Details */}
                <div className="flex gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {karte.Gueltig_bis && (
                    <span>bis {new Date(karte.Gueltig_bis).toLocaleDateString('de-DE')}</span>
                  )}
                  {karte.Preis_EUR && <span>{karte.Preis_EUR}€</span>}
                  {karte.Karten_ID && <span>{karte.Karten_ID}</span>}
                </div>
              </button>

              {/* Detail-Panel */}
              {isSelected && (
                <div className="rounded-b-lg p-4 -mt-1" style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderTop: 'none',
                }}>
                  {/* Formular-Toggle */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      Unterrichtseinheiten
                    </h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowForm(!showForm) }}
                      className="btn-primary text-sm"
                    >
                      {showForm ? 'Abbrechen' : '+ Neue Einheit'}
                    </button>
                  </div>

                  {/* Formular: Neue Einheit */}
                  {showForm && (
                    <div className="rounded-lg p-4 mb-4" style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-medium)',
                    }}>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {/* Datum */}
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Datum</label>
                          <input
                            type="date"
                            value={formDatum}
                            onChange={(e) => setFormDatum(e.target.value)}
                            className="w-full p-2 rounded border text-sm bg-transparent"
                            style={{ borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                          />
                        </div>

                        {/* Uhrzeit */}
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Uhrzeit (optional)</label>
                          <input
                            type="time"
                            value={formUhrzeit}
                            onChange={(e) => setFormUhrzeit(e.target.value)}
                            className="w-full p-2 rounded border text-sm bg-transparent"
                            style={{ borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>

                      {/* Dauer */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Dauer (Stunden)
                        </label>
                        <div className="flex gap-2">
                          {['0.5', '0.75', '1', '1.5', '2'].map(d => (
                            <button
                              key={d}
                              onClick={() => setFormDauer(d)}
                              className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
                              style={{
                                backgroundColor: formDauer === d ? 'var(--primary)' : 'var(--bg-secondary)',
                                color: formDauer === d ? 'white' : 'var(--text-secondary)',
                                border: `1px solid ${formDauer === d ? 'var(--primary)' : 'var(--border-medium)'}`,
                              }}
                            >
                              {d}h
                            </button>
                          ))}
                          <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            value={formDauer}
                            onChange={(e) => setFormDauer(e.target.value)}
                            className="w-20 p-1.5 rounded border text-sm text-center bg-transparent"
                            style={{ borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>

                      {/* Unterrichtsinhalte */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Unterrichtsinhalte</label>
                        <textarea
                          value={formInhalte}
                          onChange={(e) => setFormInhalte(e.target.value)}
                          placeholder="Was wurde geübt?"
                          rows={2}
                          className="w-full p-2 rounded border text-sm bg-transparent resize-none"
                          style={{ borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      {/* Fortschritt (Sterne) */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Fortschritt (optional)</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              onClick={() => setFormFortschritt(formFortschritt === n ? 0 : n)}
                              className="text-xl transition-transform hover:scale-110"
                              style={{ opacity: n <= formFortschritt ? 1 : 0.3 }}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notizen */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Notizen (optional)</label>
                        <textarea
                          value={formNotizen}
                          onChange={(e) => setFormNotizen(e.target.value)}
                          placeholder="Zusätzliche Bemerkungen..."
                          rows={2}
                          className="w-full p-2 rounded border text-sm bg-transparent resize-none"
                          style={{ borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      {/* Speichern */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Rest nach Buchung: {Math.max(0, getRestStunden(selectedKarte!) - parseFloat(formDauer || '0')).toFixed(1)}h
                        </span>
                        <button
                          onClick={handleSaveEinheit}
                          disabled={saving || !formDatum || !formDauer || parseFloat(formDauer) <= 0}
                          className="btn-primary text-sm"
                          style={{
                            opacity: saving || !formDatum || !formDauer ? 0.5 : 1,
                            cursor: saving ? 'wait' : 'pointer',
                          }}
                        >
                          {saving ? 'Speichern...' : 'Einheit speichern'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Einheiten-Liste */}
                  {einheitenLoading ? (
                    <div className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                      Einheiten werden geladen...
                    </div>
                  ) : einheiten.length === 0 ? (
                    <div className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                      Noch keine Einheiten erfasst
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {einheiten.map(einheit => (
                        <div
                          key={einheit.id}
                          className="rounded-lg p-3 text-sm"
                          style={{
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-light)',
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {einheit.Datum ? new Date(einheit.Datum).toLocaleDateString('de-DE') : '-'}
                              </span>
                              {einheit.Uhrzeit && (
                                <span style={{ color: 'var(--text-muted)' }}> {einheit.Uhrzeit}</span>
                              )}
                              <span className="ml-2 font-medium" style={{ color: 'var(--primary)' }}>
                                {formatDauer(einheit.Dauer_Stunden)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {einheit.Fortschritt && (
                                <span className="text-xs">{getFortschrittStars(einheit.Fortschritt)}</span>
                              )}
                              {einheit.Status && (
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{
                                  backgroundColor: 'var(--bg-secondary)',
                                  color: 'var(--text-muted)',
                                }}>
                                  {einheit.Status.value}
                                </span>
                              )}
                            </div>
                          </div>
                          {einheit.Unterrichtsinhalte && (
                            <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                              {einheit.Unterrichtsinhalte}
                            </div>
                          )}
                          {einheit.Notizen && (
                            <div className="mt-1 italic" style={{ color: 'var(--text-muted)' }}>
                              {einheit.Notizen}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
