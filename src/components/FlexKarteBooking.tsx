'use client'

import { useState, useEffect } from 'react'
import { SchülerApp } from '@/lib/baserow'
import { OfflineStorageManager } from '@/lib/offlineSync'

interface FlexKarteBookingProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  preselectedStudent?: SchülerApp
}

const KARTEN_TYPEN = [
  { label: '2 Stunden (125€)', value: '2-Std (125€)', preis: 125, kontingent: 2.0, minuten: 120 },
  { label: '5 Stunden (305€)', value: '5-Std (305€)', preis: 305, kontingent: 5.0, minuten: 300 },
  { label: '10 Stunden (595€)', value: '10-Std (595€)', preis: 595, kontingent: 10.0, minuten: 600 },
]

export default function FlexKarteBooking({ isOpen, onClose, onSuccess, preselectedStudent }: FlexKarteBookingProps) {
  const [students, setStudents] = useState<SchülerApp[]>([])
  const [selectedStudent, setSelectedStudent] = useState<number | ''>(preselectedStudent ? preselectedStudent.id : '')
  const [selectedTyp, setSelectedTyp] = useState(0)
  const [kaufdatum, setKaufdatum] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Schülerliste nur laden wenn kein preselectedStudent (für Dashboard-Nutzung)
      if (!preselectedStudent) {
        const storage = OfflineStorageManager.getInstance()
        storage.getStudents().then(all => {
          const active = all.filter(s =>
            s.anfrageStatus === 'aktiver Schüler' ||
            s.anfrageStatus === 'Probeunterricht abgeschlossen' ||
            !s.anfrageStatus
          ).sort((a, b) => a.vorname.localeCompare(b.vorname))
          setStudents(active)
        })
      }
      // Reset form - preselect student if provided
      setSelectedStudent(preselectedStudent ? preselectedStudent.id : '')
      setSelectedTyp(0)
      setKaufdatum(new Date().toISOString().split('T')[0])
      setSuccess(false)
      setError('')
    }
  }, [isOpen, preselectedStudent])

  const handleSubmit = async () => {
    if (!selectedStudent) {
      setError('Bitte Schüler auswählen')
      return
    }

    const typ = KARTEN_TYPEN[selectedTyp]
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/flex-karten-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schueler_id: selectedStudent,
          kartentyp: typ.value,
          gekauft_am: kaufdatum,
          preis: typ.preis,
          kontingent_stunden: typ.kontingent,
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Buchen')
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 2000)
    } catch (err) {
      setError('Fehler beim Buchen. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const typ = KARTEN_TYPEN[selectedTyp]
  const displayStudent = preselectedStudent || students.find(s => s.id === selectedStudent)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-xl shadow-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Flex-Karte buchen</h2>
          <button onClick={onClose} className="text-2xl leading-none px-2" style={{ color: 'var(--text-muted)' }}>&times;</button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">&#10003;</div>
            <div className="text-lg font-semibold" style={{ color: 'var(--status-success)' }}>
              Flex-Karte erfolgreich gebucht!
            </div>
            <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Rechnung wird erstellt.
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Schüler - fest oder Dropdown */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Schüler</label>
              {preselectedStudent ? (
                <div
                  className="w-full p-3 rounded-lg border font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-medium)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {preselectedStudent.vorname} {preselectedStudent.nachname}
                </div>
              ) : (
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-3 rounded-lg border font-medium"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-medium)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">Schüler auswählen...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Kartentyp */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Kartentyp</label>
              <div className="space-y-2">
                {KARTEN_TYPEN.map((kt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTyp(i)}
                    className={`w-full p-3 rounded-lg text-left font-medium transition-colors border ${selectedTyp === i ? 'border-2' : ''}`}
                    style={{
                      backgroundColor: selectedTyp === i ? 'var(--accent-light)' : 'var(--bg-primary)',
                      borderColor: selectedTyp === i ? 'var(--primary)' : 'var(--border-medium)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span>{kt.label}</span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{kt.minuten} Min</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Kaufdatum */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Kaufdatum</label>
              <input
                type="date"
                value={kaufdatum}
                onChange={(e) => setKaufdatum(e.target.value)}
                className="w-full p-3 rounded-lg border font-medium"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Zusammenfassung */}
            {selectedStudent && (
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--accent-light)' }}>
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Zusammenfassung</div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {displayStudent?.vorname} {displayStudent?.nachname} &mdash; {typ.label}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Kaufdatum: {new Date(kaufdatum).toLocaleDateString('de-DE')}
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm font-medium p-3 rounded-lg" style={{ backgroundColor: 'var(--status-error)', color: 'white' }}>
                {error}
              </div>
            )}

            {/* Button */}
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedStudent}
              className="w-full py-3 rounded-lg font-semibold text-white transition-colors"
              style={{
                backgroundColor: loading || !selectedStudent ? 'var(--border-medium)' : 'var(--primary)',
                cursor: loading || !selectedStudent ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Wird gebucht...' : 'Flex-Karte buchen'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
