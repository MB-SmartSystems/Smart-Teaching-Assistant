'use client'

import { SchülerApp } from '@/lib/baserow'
import { useState, useEffect } from 'react'
import { useOfflineSync } from '@/lib/offlineSync'
import BookDropdown from './BookDropdown'
import EarningsCard from './EarningsCard'
import FlexKarteBooking from './FlexKarteBooking'
import SongSuggestions from './SongSuggestions'
import { useToast } from './Toast'
import { FlexKarte, fetchFlexKarten, getRestStunden, getVerbraucht } from '@/lib/flexKarten'
import { createUnterrichtseinheit, updateFlexKarteStunden } from '@/lib/unterrichtseinheiten'
import { 
  getTodayAttendance, 
  setAttendance, 
  getAttendanceStats, 
  getTodayString,
  AttendanceStatus,
  getStatusText,
  getStatusColor
} from '@/lib/attendance'

interface SchülerCardCompactProps {
  student: SchülerApp
  isOpen: boolean
  onClose: () => void
}

// Baserow max 1 Dezimalstelle
function formatDecimal(value: number): string {
  if (value % 1 === 0) return value.toString()
  return value.toFixed(1)
}

export default function SchülerCardCompact({ student, isOpen, onClose }: SchülerCardCompactProps) {
  const { updateField } = useOfflineSync()
  const toast = useToast()

  // Local State für Auto-Save
  const [isSaving, setIsSaving] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)

  // FlexKarte State für Quick-Buttons
  const [activeFlexKarte, setActiveFlexKarte] = useState<FlexKarte | null>(null)
  const [quickButtonLoading, setQuickButtonLoading] = useState(false)
  const [confirmMinutes, setConfirmMinutes] = useState<number | null>(null)
  
  // Parse Übungen-String zu von/bis Zahlen
  const parseUebungen = (ubungString: string): { von: number; bis: number } => {
    if (!ubungString) return { von: 1, bis: 1 }
    
    const dashMatch = ubungString.match(/(\d+)-(\d+)/)
    if (dashMatch) {
      return { von: parseInt(dashMatch[1]), bis: parseInt(dashMatch[2]) }
    }
    
    const singleMatch = ubungString.match(/(\d+)/)
    if (singleMatch) {
      const num = parseInt(singleMatch[1])
      return { von: num, bis: num }
    }
    
    return { von: 1, bis: 1 }
  }

  const initialUebungen = parseUebungen(student.übung || '')
  const initialUebungen2 = parseUebungen(student.übung2 || '')

  // Lokale Werte (werden erst bei Save übertragen)
  const [localValues, setLocalValues] = useState({
    buch: student.buch,
    seite: student.seite,
    übung: student.übung,
    übungVon: initialUebungen.von as number | string,
    übungBis: initialUebungen.bis as number | string,
    buch2: student.buch2,
    seite2: student.seite2,
    übung2: student.übung2,
    übung2Von: initialUebungen2.von as number | string,
    übung2Bis: initialUebungen2.bis as number | string,
    wichtigerFokus: student.wichtigerFokus,
    aktuelleLieder: student.aktuelleLieder,
    zahlungStatus: student.zahlungStatus,
    hatSchlagzeug: student.hatSchlagzeug
  })

  // FlexKarte laden für Quick-Buttons
  useEffect(() => {
    if (isOpen) {
      fetchFlexKarten().then(karten => {
        const aktive = karten.find(k =>
          k.Schueler_Link?.[0]?.id === student.id && k.Status?.value === 'Aktiv'
        )
        setActiveFlexKarte(aktive || null)
      })
    }
  }, [isOpen, student.id])

  // Quick-Button: Stunde dokumentieren
  const handleQuickLesson = async (minuten: number) => {
    if (!activeFlexKarte) return
    setQuickButtonLoading(true)
    try {
      const stunden = minuten / 60
      const verbraucht = getVerbraucht(activeFlexKarte)
      const rest = getRestStunden(activeFlexKarte)
      const neueVerbraucht = verbraucht + stunden
      const neueRest = Math.max(0, rest - stunden)

      // Unterrichtseinheit erstellen
      await createUnterrichtseinheit({
        datum: new Date().toISOString().split('T')[0],
        uhrzeit: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        dauer: formatDecimal(stunden),
        schueler_id: student.id,
        flexkarte_id: activeFlexKarte.id,
      })

      // FlexKarte-Stunden aktualisieren
      await updateFlexKarteStunden(activeFlexKarte.id, neueVerbraucht, neueRest)

      // Lokalen State aktualisieren
      setActiveFlexKarte(prev => prev ? {
        ...prev,
        Verbrauchte_Stunden: formatDecimal(neueVerbraucht),
        Rest_Stunden: formatDecimal(neueRest),
      } : null)

      toast.success(`${minuten} Min abgezogen. Guthaben: ${neueRest.toFixed(1)} Std.`)
      setConfirmMinutes(null)
    } catch (err) {
      toast.error('Fehler beim Dokumentieren der Stunde')
    } finally {
      setQuickButtonLoading(false)
    }
  }

  // FlexKarte Booking State
  const [showFlexBooking, setShowFlexBooking] = useState(false)

  // Attendance State
  const [attendanceKey, setAttendanceKey] = useState(Date.now())
  const todayAttendance = getTodayAttendance(student.id)
  const attendanceStats = getAttendanceStats(student.id, 30)

  // Felder die KEINEN Toast bekommen (zu häufig geändert)
  const SILENT_FIELDS = new Set(['buch', 'seite', 'übung', 'buch2', 'seite2', 'übung2'])

  // Feld-Labels für Toasts
  const FIELD_LABELS: Record<string, string> = {
    wichtigerFokus: 'Fokus',
    aktuelleLieder: 'Lieder',
  }

  // Update lokale Werte + Auto-Save (showToast=false für textareas, die onBlur toasten)
  const updateLocalValue = async (field: keyof SchülerApp, value: string, showToast = false) => {
    setLocalValues(prev => ({ ...prev, [field]: value }))
    try {
      await updateField(student.id, field, value)
      if (showToast && !SILENT_FIELDS.has(field)) {
        toast.success(`${FIELD_LABELS[field] || field} gespeichert`)
      }
    } catch (error) {
      console.error(`Fehler beim Auto-Save ${field}:`, error)
    }
  }

  // Seiten +/- Handler 
  const handleSeiteUpdate = async (change: number) => {
    const currentValue = parseInt(localValues.seite || '1')
    const newValue = Math.max(1, currentValue + change)
    await updateLocalValue('seite', newValue.toString())
  }

  const handleSeite2Update = async (change: number) => {
    const currentValue = parseInt(localValues.seite2 || '1')
    const newValue = Math.max(1, currentValue + change)
    await updateLocalValue('seite2', newValue.toString())
  }

  // Übungen +/- Handler mit Smart Logic
  const handleUebungUpdate = async (field: 'übungVon' | 'übungBis', change: number) => {
    const currentVon = typeof localValues.übungVon === 'string' ? parseInt(localValues.übungVon) || 1 : localValues.übungVon
    const currentBis = typeof localValues.übungBis === 'string' ? parseInt(localValues.übungBis) || 1 : localValues.übungBis
    
    let newVon = currentVon
    let newBis = currentBis
    
    if (field === 'übungVon') {
      newVon = Math.max(1, currentVon + change)
      // Smart Logic: Wenn "von" über "bis" erhöht wird, setze "bis" = "von"
      if (newVon > currentBis) {
        newBis = newVon
      } else {
        newBis = currentBis // "bis" bleibt unverändert
      }
    } else {
      // "bis" kann unabhängig geändert werden, aber nie unter "von"
      newBis = Math.max(currentVon, currentBis + change)
    }
    
    // Format: "von-bis" oder nur "von" wenn gleich
    const ubungString = newVon === newBis ? newVon.toString() : `${newVon}-${newBis}`
    
    setLocalValues(prev => ({ 
      ...prev, 
      übungVon: newVon,
      übungBis: newBis,
      übung: ubungString
    }))
    
    // Auto-Save
    try {
      await updateField(student.id, 'übung', ubungString)
    } catch (error) {
      console.error('Fehler beim Auto-Save Übung:', error)
    }
  }

  // Übungen 2 Handler 
  const handleUebung2Update = async (field: 'übung2Von' | 'übung2Bis', change: number) => {
    const currentVon = typeof localValues.übung2Von === 'string' ? parseInt(localValues.übung2Von) || 1 : localValues.übung2Von
    const currentBis = typeof localValues.übung2Bis === 'string' ? parseInt(localValues.übung2Bis) || 1 : localValues.übung2Bis
    
    let newVon = currentVon
    let newBis = currentBis
    
    if (field === 'übung2Von') {
      newVon = Math.max(1, currentVon + change)
      if (newVon > currentBis) newBis = newVon
    } else {
      newBis = Math.max(currentVon, currentBis + change)
    }
    
    const ubungString = newVon === newBis ? newVon.toString() : `${newVon}-${newBis}`
    
    setLocalValues(prev => ({ 
      ...prev, 
      übung2Von: newVon,
      übung2Bis: newBis,
      übung2: ubungString
    }))
    
    // Auto-Save
    try {
      await updateField(student.id, 'übung2', ubungString)
    } catch (error) {
      console.error('Fehler beim Auto-Save Übung2:', error)
    }
  }

  // Auto-Save für Select-Felder
  const handleSelectUpdate = async (field: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [field]: value }))

    try {
      if (field === 'zahlungStatus') {
        const optionId = ZAHLUNG_OPTIONS[value]
        if (optionId) {
          await updateField(student.id, field, optionId)
          toast.success('Zahlung gespeichert')
        }
      } else if (field === 'hatSchlagzeug') {
        const optionId = SCHLAGZEUG_OPTIONS[value]
        if (optionId) {
          await updateField(student.id, field, optionId)
          toast.success('Schlagzeug gespeichert')
        }
      }
    } catch (error) {
      console.error(`Fehler beim Auto-Save ${field}:`, error)
    }
  }

  // Zahlung-Status Update (mit korrekten Option-IDs)
  const ZAHLUNG_OPTIONS: Record<string, number> = {
    'ja': 3198,
    'nein': 3199, 
    'unbekannt': 3200,
    'Paypal': 3241,
  }

  const SCHLAGZEUG_OPTIONS: Record<string, number> = {
    'Ja': 3569,
    'Nein': 3570,
    'Unbekannt': 3571,
  }

  // Attendance Handler
  const handleAttendanceUpdate = async (status: AttendanceStatus) => {
    setAttendance(student.id, getTodayString(), status)
    setAttendanceKey(Date.now()) // Force re-render
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}>
        
        {/* Header - Modern Design */}
        <div className="flex items-center justify-between p-6 border-b" style={{ 
          borderColor: 'var(--border-light)', 
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
        }}>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {student.vorname} {student.nachname}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-white/90">
              <span>📅 {student.unterrichtstag} {student.unterrichtszeit}</span>
              {student.anfrageStatus && (
                <span className="badge badge-success">{student.anfrageStatus}</span>
              )}
            </div>
            {student.monatlicherbetrag && (
              <p className="text-white/80 text-sm mt-1">
                💰 {student.monatlicherbetrag}€ / Monat
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-secondary bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600/30"
            >
              ✕ Schließen
            </button>
          </div>
        </div>

        <div className="p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          
          {/* Buch 1 - Modern Card */}
          <div className="card-compact mb-6">
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              📖 Buch
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Buch</label>
              <BookDropdown
                currentBook={localValues.buch}
                onBookChange={(book) => updateLocalValue('buch', book)}
                isEditing={true}
                onToggleEdit={() => {}}
              />
            </div>
            <div className="flex items-end gap-4 flex-wrap">
              {/* Seite */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Seite</label>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handleSeiteUpdate(-1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">−</button>
                  <input
                    type="text"
                    value={localValues.seite}
                    onChange={(e) => updateLocalValue('seite', e.target.value)}
                    onBlur={(e) => {
                      const value = Math.max(1, parseInt(e.target.value) || 1)
                      updateLocalValue('seite', value.toString())
                    }}
                    className="text-center font-semibold text-sm py-1 rounded-lg border-none outline-none"
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '3rem' }}
                  />
                  <button onClick={() => handleSeiteUpdate(1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">+</button>
                </div>
              </div>
              {/* Übung Von */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Übung Von</label>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handleUebungUpdate('übungVon', -1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">−</button>
                  <input
                    type="text"
                    value={localValues.übungVon}
                    onChange={(e) => {
                      setLocalValues(prev => ({ ...prev, übungVon: e.target.value === '' ? '' : (parseInt(e.target.value) || prev.übungVon) }))
                    }}
                    onBlur={async (e) => {
                      const newVon = Math.max(1, parseInt(e.target.value) || 1)
                      const currentBis = typeof localValues.übungBis === 'string' ? parseInt(localValues.übungBis) || 1 : localValues.übungBis
                      const newBis = Math.max(newVon, currentBis)
                      const ubungString = newVon === newBis ? newVon.toString() : `${newVon}-${newBis}`
                      setLocalValues(prev => ({ ...prev, übungVon: newVon, übungBis: newBis, übung: ubungString }))
                      try { await updateField(student.id, 'übung', ubungString) } catch (error) { console.error('Fehler beim Auto-Save Übung:', error) }
                    }}
                    className="text-center font-semibold text-sm py-1 rounded-lg border-none outline-none"
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '3rem' }}
                  />
                  <button onClick={() => handleUebungUpdate('übungVon', 1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">+</button>
                </div>
              </div>
              {/* Übung Bis */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Übung Bis</label>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handleUebungUpdate('übungBis', -1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">−</button>
                  <input
                    type="text"
                    value={localValues.übungBis}
                    onChange={(e) => {
                      setLocalValues(prev => ({ ...prev, übungBis: e.target.value === '' ? '' : (parseInt(e.target.value) || prev.übungBis) }))
                    }}
                    onBlur={async (e) => {
                      const currentVon = typeof localValues.übungVon === 'string' ? parseInt(localValues.übungVon) || 1 : localValues.übungVon
                      const newBis = Math.max(currentVon, parseInt(e.target.value) || currentVon)
                      const ubungString = currentVon === newBis ? currentVon.toString() : `${currentVon}-${newBis}`
                      setLocalValues(prev => ({ ...prev, übungBis: newBis, übung: ubungString }))
                      try { await updateField(student.id, 'übung', ubungString) } catch (error) { console.error('Fehler beim Auto-Save Übung:', error) }
                    }}
                    className="text-center font-semibold text-sm py-1 rounded-lg border-none outline-none"
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '3rem' }}
                  />
                  <button onClick={() => handleUebungUpdate('übungBis', 1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Buch 2 - Modern Card */}
          <div className="card-compact mb-6">
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              📚 Buch 2
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Buch 2</label>
              <BookDropdown
                currentBook={localValues.buch2}
                onBookChange={(book) => updateLocalValue('buch2', book)}
                isEditing={true}
                onToggleEdit={() => {}}
              />
            </div>
            <div className="flex items-end gap-4 flex-wrap">
              {/* Seite 2 */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Seite</label>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handleSeite2Update(-1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">−</button>
                  <input
                    type="text"
                    value={localValues.seite2}
                    onChange={(e) => updateLocalValue('seite2', e.target.value)}
                    onBlur={(e) => {
                      const value = Math.max(1, parseInt(e.target.value) || 1)
                      updateLocalValue('seite2', value.toString())
                    }}
                    className="text-center font-semibold text-sm py-1 rounded-lg border-none outline-none"
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '3rem' }}
                  />
                  <button onClick={() => handleSeite2Update(1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">+</button>
                </div>
              </div>
              {/* Übung 2 Von */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Übung Von</label>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handleUebung2Update('übung2Von', -1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">−</button>
                  <input
                    type="text"
                    value={localValues.übung2Von}
                    onChange={(e) => {
                      setLocalValues(prev => ({ ...prev, übung2Von: e.target.value === '' ? '' : (parseInt(e.target.value) || prev.übung2Von) }))
                    }}
                    onBlur={async (e) => {
                      const newVon = Math.max(1, parseInt(e.target.value) || 1)
                      const currentBis = typeof localValues.übung2Bis === 'string' ? parseInt(localValues.übung2Bis) || 1 : localValues.übung2Bis
                      const newBis = Math.max(newVon, currentBis)
                      const ubungString = newVon === newBis ? newVon.toString() : `${newVon}-${newBis}`
                      setLocalValues(prev => ({ ...prev, übung2Von: newVon, übung2Bis: newBis, übung2: ubungString }))
                      try { await updateField(student.id, 'übung2', ubungString) } catch (error) { console.error('Fehler beim Auto-Save Übung2:', error) }
                    }}
                    className="text-center font-semibold text-sm py-1 rounded-lg border-none outline-none"
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '3rem' }}
                  />
                  <button onClick={() => handleUebung2Update('übung2Von', 1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">+</button>
                </div>
              </div>
              {/* Übung 2 Bis */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Übung Bis</label>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handleUebung2Update('übung2Bis', -1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">−</button>
                  <input
                    type="text"
                    value={localValues.übung2Bis}
                    onChange={(e) => {
                      setLocalValues(prev => ({ ...prev, übung2Bis: e.target.value === '' ? '' : (parseInt(e.target.value) || prev.übung2Bis) }))
                    }}
                    onBlur={async (e) => {
                      const currentVon = typeof localValues.übung2Von === 'string' ? parseInt(localValues.übung2Von) || 1 : localValues.übung2Von
                      const newBis = Math.max(currentVon, parseInt(e.target.value) || currentVon)
                      const ubungString = currentVon === newBis ? currentVon.toString() : `${currentVon}-${newBis}`
                      setLocalValues(prev => ({ ...prev, übung2Bis: newBis, übung2: ubungString }))
                      try { await updateField(student.id, 'übung2', ubungString) } catch (error) { console.error('Fehler beim Auto-Save Übung2:', error) }
                    }}
                    className="text-center font-semibold text-sm py-1 rounded-lg border-none outline-none"
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', width: '3rem' }}
                  />
                  <button onClick={() => handleUebung2Update('übung2Bis', 1)} className="btn-secondary w-7 h-7 p-0 text-sm font-bold">+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Wichtiger Fokus */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>🎯 Wichtiger Fokus</h3>
            <textarea
              value={localValues.wichtigerFokus}
              onChange={(e) => updateLocalValue('wichtigerFokus', e.target.value)}
              onBlur={() => toast.success('Fokus gespeichert')}
              className="w-full p-3 rounded border text-white bg-gray-800 border-gray-600 focus:border-blue-500"
              rows={3}
              placeholder="Was ist der wichtigste Fokus für diesen Schüler?"
            />
          </div>

          {/* Aktuelle Lieder */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>🎵 Aktuelle Lieder</h3>
            <textarea
              value={localValues.aktuelleLieder}
              onChange={(e) => updateLocalValue('aktuelleLieder', e.target.value)}
              onBlur={() => toast.success('Lieder gespeichert')}
              className="w-full p-3 rounded border text-white bg-gray-800 border-gray-600 focus:border-blue-500"
              rows={3}
              placeholder="Welche Lieder werden aktuell geübt?"
            />
          </div>

          {/* Zahlung */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>💳 Zahlung</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['ja', 'nein', 'Paypal', 'unbekannt'].map(status => (
                <button
                  key={status}
                  onClick={() => handleSelectUpdate('zahlungStatus', status)}
                  className={localValues.zahlungStatus === status
                    ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
                    : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
                  style={localValues.zahlungStatus === status
                    ? {
                        backgroundColor: status === 'ja' ? '#10b981' :
                                       status === 'nein' ? '#ef4444' :
                                       status === 'Paypal' ? '#3b82f6' : '#6b7280',
                        color: 'white'
                      }
                    : { backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563' }}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Schlagzeug */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>🥁 Hat Schlagzeug</h3>
            <div className="grid grid-cols-3 gap-2">
              {['Ja', 'Nein', 'Unbekannt'].map(status => (
                <button
                  key={status}
                  onClick={() => handleSelectUpdate('hatSchlagzeug', status)}
                  className={localValues.hatSchlagzeug === status
                    ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
                    : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
                  style={localValues.hatSchlagzeug === status
                    ? {
                        backgroundColor: status === 'Ja' ? '#10b981' :
                                       status === 'Nein' ? '#ef4444' : '#6b7280',
                        color: 'white'
                      }
                    : { backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563' }}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Anwesenheit - Vereinfacht */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>📅 Anwesenheit Heute</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {(['krank_abgemeldet', 'schulfrei', 'nicht_erschienen'] as AttendanceStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => handleAttendanceUpdate(status)}
                  className={todayAttendance?.status === status
                    ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
                    : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
                  style={todayAttendance?.status === status
                    ? { backgroundColor: getStatusColor(status), color: 'white' }
                    : { backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563' }}
                >
                  {getStatusText(status)}
                </button>
              ))}
            </div>
            <div className="mt-3 text-sm" style={{ color: '#9ca3af' }}>
              💡 Standard: Erschienen (keine Auswahl nötig)
            </div>
          </div>

          {/* Quick-Buttons: Stunde dokumentieren (nur wenn aktive FlexKarte) */}
          {activeFlexKarte && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>
                ⏱ Stunde dokumentieren
                <span className="text-sm font-normal ml-2" style={{ color: '#9ca3af' }}>
                  (Guthaben: {getRestStunden(activeFlexKarte).toFixed(1)} Std)
                </span>
              </h3>
              {confirmMinutes ? (
                <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}>
                  <div className="text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                    {confirmMinutes} Min für {student.vorname} abziehen?
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuickLesson(confirmMinutes)}
                      disabled={quickButtonLoading}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: quickButtonLoading ? 'var(--border-medium)' : '#10b981' }}
                    >
                      {quickButtonLoading ? 'Wird gespeichert...' : 'Ja, abziehen'}
                    </button>
                    <button
                      onClick={() => setConfirmMinutes(null)}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ color: 'var(--text-muted)', backgroundColor: '#374151' }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[30, 45, 60].map(min => (
                    <button
                      key={min}
                      onClick={() => setConfirmMinutes(min)}
                      className="py-3 px-4 rounded-lg font-semibold text-sm transition-colors"
                      style={{ backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563' }}
                    >
                      {min} Min
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Flex-Karte buchen */}
          <div className="mb-6">
            <button
              onClick={() => setShowFlexBooking(true)}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors text-sm"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              🎫 Flex-Karte buchen
            </button>
          </div>

          {/* FlexKarte Booking Modal */}
          <FlexKarteBooking
            isOpen={showFlexBooking}
            onClose={() => setShowFlexBooking(false)}
            preselectedStudent={student}
          />

          {/* Earnings Card */}
          <EarningsCard student={student} />

        </div>
      </div>
    </div>
  )
}