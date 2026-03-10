'use client'

import { SchülerApp, BaserowAPI } from '@/lib/baserow'
import { useState } from 'react'
import { useOfflineSync } from '@/lib/offlineSync'
import BookDropdown from './BookDropdown'
import EarningsCard from './EarningsCard'
import SongSuggestions from './SongSuggestions'
import SongManagement from './SongManagement'
import { Song } from '@/lib/songs'
import { 
  getTodayAttendance, 
  setAttendance, 
  getAttendanceStats, 
  getTodayString,
  AttendanceStatus,
  getStatusText,
  getStatusColor
} from '@/lib/attendance'

interface SchülerCardProps {
  student: SchülerApp
  isActive?: boolean
}

export default function SchülerCard({ student, isActive = false }: SchülerCardProps) {
  const { updateField } = useOfflineSync()

  // Local State für Inline-Editing
  const [editingField, setEditingField] = useState<string | null>(null)

  // Counter für Anwesenheits-Rerender
  const [attendanceVersion, setAttendanceVersion] = useState(0)
  
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

  const [localValues, setLocalValues] = useState({
    buch: student.buch,
    seite: student.seite,
    übung: student.übung,
    übungVon: initialUebungen.von,
    übungBis: initialUebungen.bis,
    buch2: student.buch2,
    seite2: student.seite2,
    übung2: student.übung2,
    übung2Von: initialUebungen2.von,
    übung2Bis: initialUebungen2.bis,
    wichtigerFokus: student.wichtigerFokus,
    aktuelleLieder: student.aktuelleLieder
  })
  const [showBuch2, setShowBuch2] = useState(!!student.buch2)
  const [localZahlung, setLocalZahlung] = useState(student.zahlungStatus)
  const [localGuthaben, setLocalGuthaben] = useState(student.guthabenMinuten)
  const [localSongStatus, setLocalSongStatus] = useState(student.songStatus || '')
  const [showSongMgmt, setShowSongMgmt] = useState(false)
  const [showAddSongForm, setShowAddSongForm] = useState(false)
  const [newSongForm, setNewSongForm] = useState({
    titel: '',
    interpret: '',
    schwierigkeit: 'Anfänger' as 'Anfänger' | 'Fortgeschritten' | 'Profi',
    buch: student.buch || '',
    mindest_seite: parseInt(student.seite || '1'),
    mindest_uebung: 1,
  })
  const [savingNewSong, setSavingNewSong] = useState(false)

  // Anwesenheits-State (attendanceVersion erzwingt Re-Read nach Update)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _av = attendanceVersion
  const todayAttendance = getTodayAttendance(student.id)
  const attendanceStats = getAttendanceStats(student.id, 30) // Letzte 30 Tage

  // Geburtstag-Status ermitteln - erweitert um "seit letztem Unterricht"
  const getBirthdayStatus = () => {
    if (!student.geburtsdatum) return null
    
    const today = new Date()
    const birthday = new Date(student.geburtsdatum)
    const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate())
    
    // Gleicher Tag und Monat - HEUTE Geburtstag
    if (birthday.getDate() === today.getDate() && 
        birthday.getMonth() === today.getMonth()) {
      return { 
        text: 'Heute Geburtstag! 🎂', 
        color: 'var(--status-warning)',
        priority: 1 
      }
    }
    
    // Seit letztem Unterricht Geburtstag gehabt?
    const lastLessonDate = getLastLessonDate(student.unterrichtstag)
    if (lastLessonDate && thisYearBirthday > lastLessonDate && thisYearBirthday < today) {
      const daysSince = Math.floor((today.getTime() - thisYearBirthday.getTime()) / (1000 * 60 * 60 * 24))
      return {
        text: `Hatte vor ${daysSince} Tag${daysSince !== 1 ? 'en' : ''} Geburtstag – schon gratuliert?`,
        color: 'var(--primary)',
        priority: 2,
        type: 'since-last-lesson' as const
      }
    }
    
    // Diese Woche kommend
    const weekFromNow = new Date()
    weekFromNow.setDate(today.getDate() + 7)
    
    if (thisYearBirthday >= today && thisYearBirthday <= weekFromNow) {
      const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return { 
        text: `Geburtstag in ${daysUntil} Tag${daysUntil !== 1 ? 'en' : ''} 🎂`, 
        color: 'var(--status-warning)',
        priority: 3 
      }
    }
    
    return null
  }

  // Letzten Unterrichtstermin berechnen
  const getLastLessonDate = (weekday: string): Date | null => {
    if (!weekday) return null
    
    const dayMap: { [key: string]: number } = {
      'Sonntag': 0, 'Montag': 1, 'Dienstag': 2, 'Mittwoch': 3,
      'Donnerstag': 4, 'Freitag': 5, 'Samstag': 6
    }
    
    const targetDay = dayMap[weekday]
    if (targetDay === undefined) return null
    
    const today = new Date()
    const todayDay = today.getDay()
    
    // Berechne Tage seit letztem Unterrichtstag
    let daysSince = todayDay - targetDay
    if (daysSince <= 0) daysSince += 7
    
    const lastLesson = new Date(today)
    lastLesson.setDate(today.getDate() - daysSince)
    
    return lastLesson
  }

  const birthdayStatus = getBirthdayStatus()

  // Feld-Update Handler (nur für SchülerApp-Felder)
  const handleFieldUpdate = async (field: 'buch' | 'seite' | 'übung' | 'buch2' | 'seite2' | 'übung2' | 'wichtigerFokus' | 'aktuelleLieder', value: string) => {
    setLocalValues(prev => ({ ...prev, [field]: value }))
    
    try {
      await updateField(student.id, field, value)
    } catch (error) {
      console.error(`Fehler beim Update von ${field}:`, error)
      // TODO: Error Toast anzeigen
    }
  }

  // Nummer-Update Handler (für Seite)
  const handleNumberUpdate = async (field: 'seite' | 'seite2', change: number) => {
    const currentValue = parseInt(localValues[field] || '1')
    const newValue = Math.max(1, currentValue + change).toString()
    
    setLocalValues(prev => ({ ...prev, [field]: newValue }))
    
    try {
      await updateField(student.id, field, newValue)
    } catch (error) {
      console.error(`Fehler beim Update von ${field}:`, error)
    }
  }

  // Übungen-Nummer-Update Handler
  const handleUebungUpdate = async (field: 'übungVon' | 'übungBis', change: number) => {
    const currentVon = localValues.übungVon
    const currentBis = localValues.übungBis
    
    let newVon = currentVon
    let newBis = currentBis
    
    if (field === 'übungVon') {
      newVon = Math.max(1, currentVon + change)
      // Wenn "von" über "bis" erhöht wird, setze "bis" = "von"
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
    
    try {
      await updateField(student.id, 'übung', ubungString)
    } catch (error) {
      console.error('Fehler beim Update der Übungen:', error)
    }
  }

  // Zahlungsstatus Update
  // Übungen Buch 2 Update Handler
  const handleUebung2Update = async (field: 'übung2Von' | 'übung2Bis', change: number) => {
    const currentVon = localValues.übung2Von
    const currentBis = localValues.übung2Bis

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

    try {
      await updateField(student.id, 'übung2', ubungString)
    } catch (error) {
      console.error('Fehler beim Update der Übungen 2:', error)
    }
  }

  // Baserow Option-IDs für field_7841 (Zahlung läuft? - Original DB)
  const ZAHLUNG_OPTIONS: Record<string, number> = {
    'ja': 3198,
    'nein': 3199,
    'unbekannt': 3200,
    'Paypal': 3241,
  }

  const handleZahlungUpdate = async (label: string) => {
    const optionId = ZAHLUNG_OPTIONS[label]
    if (!optionId) return
    setLocalZahlung(label)
    try {
      await BaserowAPI.updateStudentField(student.id, 'field_7858', optionId)
    } catch (error) {
      console.error('Fehler beim Update des Zahlungsstatus:', error)
      setLocalZahlung(student.zahlungStatus) // Revert on error
    }
  }

  // Guthaben-Minuten updaten
  const handleGuthabenUpdate = async (neuesGuthaben: number) => {
    const clamped = Math.max(0, neuesGuthaben)
    setLocalGuthaben(clamped)
    try {
      await BaserowAPI.updateStudentField(student.id, 'field_8172', clamped)
    } catch (error) {
      console.error('Fehler beim Update des Guthabens:', error)
      setLocalGuthaben(localGuthaben) // Revert on error
    }
  }

  // Baserow Option-IDs für field_7849 (Hat Schlagzeug - Original DB)
  const SCHLAGZEUG_OPTIONS: Record<string, number> = {
    'Ja': 3572,
    'Nein': 3573,
    'Unbekannt': 3574,
  }

  const handleSchlagzeugUpdate = async (label: string) => {
    const optionId = SCHLAGZEUG_OPTIONS[label]
    if (!optionId) return
    try {
      // Send integer option ID directly to Baserow API
      await BaserowAPI.updateStudentField(student.id, 'field_7849', optionId)
      // Reload to show updated status
      window.location.reload()
    } catch (error) {
      console.error('Fehler beim Update des Schlagzeug-Status:', error)
      // Show error details in console for debugging Option-IDs
      console.log('Full error:', error)
    }
  }

  // Anwesenheits-Update
  const handleAttendanceUpdate = (status: AttendanceStatus) => {
    const today = getTodayString()
    setAttendance(student.id, today, status)
    setAttendanceVersion(prev => prev + 1)
  }

  // WhatsApp Link generieren (direkt zu wa.me für bessere Kompatibilität)
  const getWhatsAppLink = () => {
    if (!student.handynummer) return '#'
    const cleanNumber = student.handynummer.replace(/[^0-9+]/g, '')
    const phoneNumber = cleanNumber.startsWith('+') ? cleanNumber.slice(1) : cleanNumber
    return `https://wa.me/${phoneNumber}?text=Hallo%20${student.ansprechpartner || student.vorname}`
  }

  // Telefon Link generieren
  const getPhoneLink = () => {
    if (!student.handynummer) return '#'
    const cleanNumber = student.handynummer.replace(/[^0-9+]/g, '')
    return `tel:${cleanNumber}`
  }

  // E-Mail Link generieren  
  const getEmailLink = () => {
    if (!student.email) return '#'
    return `mailto:${student.email}?subject=Schlagzeugunterricht%20${student.vorname}`
  }

  return (
    <div className={`
      rounded-lg shadow-md border p-6 mb-6
      ${isActive ? 'border-l-4' : 'border-gray-200'}
      ${birthdayStatus ? 'ring-2 ring-orange-400' : ''}
      transition-all duration-200 hover:shadow-lg hover:-translate-y-1
    `} style={{
      borderColor: isActive ? 'var(--status-active)' : 'var(--border-light)',
      backgroundColor: isActive ? 'var(--status-active-bg)' : 'var(--bg-secondary)'
    }}>
      
      {/* Header mit Name und Geburtstag */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold mb-1" style={{ color: '#ffffff' }}>
            {student.vorname} {student.nachname}
          </h2>
          <p className="text-base font-semibold" style={{ color: '#ffffff' }}>
            {student.unterrichtstag} {student.unterrichtszeit} • {student.anfrageStatus || 'Aktiv'}
          </p>
          {student.monatlicherbetrag && (
            <p className="text-sm" style={{ color: '#cbd5e1' }}>
              Monatsbeitrag: {student.monatlicherbetrag}€
            </p>
          )}
        </div>
        
        {birthdayStatus && birthdayStatus.priority !== 2 && (
          <span className="px-3 py-2 rounded-lg text-white text-sm font-bold" style={{
            backgroundColor: birthdayStatus.color
          }}>
            {birthdayStatus.text}
          </span>
        )}
      </div>

      {/* Geburtstag-Banner: seit letzter Stunde */}
      {birthdayStatus && birthdayStatus.priority === 2 && (
        <div className="flex items-center gap-3 rounded-xl px-5 py-4 mb-6 animate-pulse" style={{
          background: 'linear-gradient(135deg, #be185d, #7c3aed)',
          boxShadow: '0 0 0 3px rgba(190, 24, 93, 0.4)'
        }}>
          <span className="text-3xl">🎂</span>
          <div>
            <p className="text-white font-bold text-base leading-tight">Geburtstag verpasst!</p>
            <p className="text-pink-100 text-sm mt-0.5">{birthdayStatus.text}</p>
          </div>
        </div>
      )}

      {/* Buch und Stand */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        
        {/* Buch - Dropdown Auswahl */}
        <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--accent-light)' }}>
          <h3 className="font-semibold mb-3 flex items-center" style={{ color: '#ffffff' }}>
            Aktuelles Buch
          </h3>
          
          <BookDropdown
            currentBook={localValues.buch}
            onBookChange={(book) => {
              setLocalValues(prev => ({ ...prev, buch: book }))
              handleFieldUpdate('buch', book)
            }}
            isEditing={editingField === 'buch'}
            onToggleEdit={() => setEditingField(editingField === 'buch' ? null : 'buch')}
          />
        </div>

        {/* Seite und Übung - kompakt nebeneinander */}
        <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--accent-light)' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#ffffff' }}>Aktueller Stand</h3>

          <div className="flex items-start gap-3">
            {/* Seite */}
            <div className="flex-shrink-0">
              <label className="text-xs font-medium mb-1 block" style={{ color: '#cbd5e1' }}>Seite</label>
              <div className="flex items-center gap-0.5">
                <button onClick={() => handleNumberUpdate('seite', -1)} className="flex items-center justify-center w-7 h-7 text-sm font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>−</button>
                <div
                  className="flex items-center justify-center h-7 font-semibold text-sm cursor-pointer rounded"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', width: '3rem' }}
                  onClick={() => setEditingField('seite')}
                >
                  {editingField === 'seite' ? (
                    <input type="number" value={localValues.seite} onChange={(e) => setLocalValues(prev => ({ ...prev, seite: e.target.value }))} onBlur={() => { handleFieldUpdate('seite', localValues.seite); setEditingField(null) }} onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()} className="text-center font-bold text-sm border-none outline-none bg-transparent" style={{ width: '3rem' }} autoFocus />
                  ) : (localValues.seite || '1')}
                </div>
                <button onClick={() => handleNumberUpdate('seite', 1)} className="flex items-center justify-center w-7 h-7 text-sm font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>+</button>
              </div>
            </div>

            {/* Übungen Von/Bis */}
            <div className="flex-shrink-0">
              <label className="text-xs font-medium mb-1 block" style={{ color: '#cbd5e1' }}>Übungen</label>
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-xs mb-0.5 text-center" style={{ color: '#94a3b8' }}>Von</div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => handleUebungUpdate('übungVon', -1)} className="flex items-center justify-center w-6 h-6 text-xs font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>−</button>
                    <div className="flex items-center justify-center h-6 text-sm font-semibold rounded" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', width: '3rem' }}>{localValues.übungVon}</div>
                    <button onClick={() => handleUebungUpdate('übungVon', 1)} className="flex items-center justify-center w-6 h-6 text-xs font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>+</button>
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-0.5 text-center" style={{ color: '#94a3b8' }}>Bis</div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => handleUebungUpdate('übungBis', -1)} className="flex items-center justify-center w-6 h-6 text-xs font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>−</button>
                    <div className="flex items-center justify-center h-6 text-sm font-semibold rounded" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', width: '3rem' }}>{localValues.übungBis}</div>
                    <button onClick={() => handleUebungUpdate('übungBis', 1)} className="flex items-center justify-center w-6 h-6 text-xs font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buch 2 - aufklappbar */}
        {showBuch2 ? (
          <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--accent-light)' }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold" style={{ color: '#ffffff' }}>Buch 2</h3>
              <button
                onClick={() => setShowBuch2(false)}
                className="text-xs px-2 py-1 rounded"
                style={{ color: 'var(--text-muted)' }}
              >
                Ausblenden
              </button>
            </div>

            <BookDropdown
              currentBook={localValues.buch2}
              onBookChange={(book) => {
                setLocalValues(prev => ({ ...prev, buch2: book }))
                handleFieldUpdate('buch2', book)
              }}
              isEditing={editingField === 'buch2'}
              onToggleEdit={() => setEditingField(editingField === 'buch2' ? null : 'buch2')}
            />

            {/* Seite 2 + Übungen 2 kompakt */}
            <div className="flex items-start gap-3 mt-4">
              <div className="flex-shrink-0">
                <label className="text-xs font-medium mb-1 block" style={{ color: '#cbd5e1' }}>Seite</label>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handleNumberUpdate('seite2', -1)} className="flex items-center justify-center w-7 h-7 text-sm font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>−</button>
                  <div className="flex items-center justify-center h-7 font-semibold text-sm cursor-pointer rounded" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', width: '3rem' }} onClick={() => setEditingField('seite2')}>
                    {editingField === 'seite2' ? (
                      <input type="number" value={localValues.seite2} onChange={(e) => setLocalValues(prev => ({ ...prev, seite2: e.target.value }))} onBlur={() => { handleFieldUpdate('seite2', localValues.seite2); setEditingField(null) }} onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()} className="text-center font-bold text-sm border-none outline-none bg-transparent" style={{ width: '3rem' }} autoFocus />
                    ) : (localValues.seite2 || '1')}
                  </div>
                  <button onClick={() => handleNumberUpdate('seite2', 1)} className="flex items-center justify-center w-7 h-7 text-sm font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>+</button>
                </div>
              </div>

              <div className="flex-shrink-0">
                <label className="text-xs font-medium mb-1 block" style={{ color: '#cbd5e1' }}>Übungen</label>
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-xs mb-0.5 text-center" style={{ color: '#94a3b8' }}>Von</div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => handleUebung2Update('übung2Von', -1)} className="flex items-center justify-center w-6 h-6 text-xs font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>−</button>
                      <div className="flex items-center justify-center h-6 text-sm font-semibold rounded" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', width: '3rem' }}>{localValues.übung2Von}</div>
                      <button onClick={() => handleUebung2Update('übung2Von', 1)} className="flex items-center justify-center w-6 h-6 text-xs font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>+</button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-0.5 text-center" style={{ color: '#94a3b8' }}>Bis</div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => handleUebung2Update('übung2Bis', -1)} className="flex items-center justify-center w-6 h-6 text-xs font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>−</button>
                      <div className="flex items-center justify-center h-6 text-sm font-semibold rounded" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', width: '3rem' }}>{localValues.übung2Bis}</div>
                      <button onClick={() => handleUebung2Update('übung2Bis', 1)} className="flex items-center justify-center w-6 h-6 text-xs font-semibold rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowBuch2(true)}
            className="w-full py-3 rounded-lg text-sm font-medium transition-colors border border-dashed"
            style={{ borderColor: 'var(--border-medium)', color: 'var(--text-muted)', backgroundColor: 'transparent' }}
          >
            + Buch 2 hinzufügen
          </button>
        )}

        {/* Wichtiger Fokus */}
        <div className="rounded-lg p-5 border-l-4" style={{
          backgroundColor: 'var(--accent-light)',
          borderLeftColor: 'var(--primary)'
        }}>
          <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>Wichtiger Fokus</h3>
          {editingField === 'wichtigerFokus' ? (
            <input
              type="text"
              value={localValues.wichtigerFokus}
              onChange={(e) => setLocalValues(prev => ({ ...prev, wichtigerFokus: e.target.value }))}
              onBlur={() => {
                handleFieldUpdate('wichtigerFokus', localValues.wichtigerFokus)
                setEditingField(null)
              }}
              onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="w-full p-3 border-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:border-transparent"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--primary)'
              } as React.CSSProperties}
              placeholder="Z.B. Handhaltung verbessern, Timing bei Fills"
              autoFocus
            />
          ) : (
            <div 
              className="cursor-pointer p-3 rounded-lg border-2 border-dashed transition-colors"
              style={{
                backgroundColor: 'var(--accent-light)',
                borderColor: 'var(--border-medium)'
              }}
              onClick={() => setEditingField('wichtigerFokus')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
            >
              {localValues.wichtigerFokus || 'Technik-Fokus hinzufügen...'}
            </div>
          )}
        </div>

        {/* Aktuelle Lieder + Vorschläge */}
        <div className="rounded-lg p-5" style={{
          backgroundColor: 'var(--primary-light)',
          borderLeft: '4px solid var(--status-success)'
        }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: '#ffffff' }}>Heute gelernt</h3>
          </div>

          {/* Aktuelle Lieder — Freitext */}
          {editingField === 'aktuelleLieder' ? (
            <input
              type="text"
              value={localValues.aktuelleLieder}
              onChange={(e) => setLocalValues(prev => ({ ...prev, aktuelleLieder: e.target.value }))}
              onBlur={() => {
                handleFieldUpdate('aktuelleLieder', localValues.aktuelleLieder)
                setEditingField(null)
              }}
              onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              autoFocus
              className="w-full p-2 rounded border text-sm mb-3"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--primary)',
                color: 'var(--text-primary)'
              }}
            />
          ) : (
            <div
              className="w-full p-2 rounded border text-sm mb-3 cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-light)',
                borderColor: 'var(--border-medium)',
                color: localValues.aktuelleLieder ? 'var(--text-primary)' : 'var(--text-muted)'
              }}
              onClick={() => setEditingField('aktuelleLieder')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
            >
              {localValues.aktuelleLieder || 'Neue Lieder hinzufügen...'}
            </div>
          )}

          {/* Lied-Vorschläge */}
          <SongSuggestions
            student={{ ...student, songStatus: localSongStatus }}
            onSongAccepted={(newStatus) => setLocalSongStatus(newStatus)}
            onEditSong={() => setShowSongMgmt(true)}
          />

          {/* + Lied zur Datenbank */}
          <div className="mt-3">
            <button
              onClick={() => setShowAddSongForm(!showAddSongForm)}
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {showAddSongForm ? '✕ Abbrechen' : '+ Lied zur Datenbank hinzufügen'}
            </button>

            {showAddSongForm && (
              <div className="mt-2 p-3 rounded border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Titel"
                    value={newSongForm.titel}
                    onChange={e => setNewSongForm(p => ({...p, titel: e.target.value}))}
                    className="p-2 rounded border text-xs"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="text"
                    placeholder="Interpret"
                    value={newSongForm.interpret}
                    onChange={e => setNewSongForm(p => ({...p, interpret: e.target.value}))}
                    className="p-2 rounded border text-xs"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select
                    value={newSongForm.schwierigkeit}
                    onChange={e => setNewSongForm(p => ({...p, schwierigkeit: e.target.value as 'Anfänger' | 'Fortgeschritten' | 'Profi'}))}
                    className="p-2 rounded border text-xs"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                  >
                    <option>Anfänger</option>
                    <option>Fortgeschritten</option>
                    <option>Profi</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Min. Seite"
                    value={newSongForm.mindest_seite}
                    onChange={e => setNewSongForm(p => ({...p, mindest_seite: parseInt(e.target.value)||1}))}
                    className="p-2 rounded border text-xs"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="number"
                    placeholder="Min. Übung"
                    value={newSongForm.mindest_uebung}
                    onChange={e => setNewSongForm(p => ({...p, mindest_uebung: parseInt(e.target.value)||1}))}
                    className="p-2 rounded border text-xs"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                  />
                </div>
                <button
                  disabled={!newSongForm.titel || !newSongForm.interpret || savingNewSong}
                  onClick={async () => {
                    setSavingNewSong(true)
                    try {
                      await fetch('/api/songs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          titel: newSongForm.titel,
                          interpret: newSongForm.interpret,
                          schwierigkeit: newSongForm.schwierigkeit,
                          buch: newSongForm.buch,
                          mindest_seite: newSongForm.mindest_seite,
                          mindest_uebung: newSongForm.mindest_uebung,
                        })
                      })
                      setNewSongForm({ titel: '', interpret: '', schwierigkeit: 'Anfänger', buch: student.buch || '', mindest_seite: parseInt(student.seite || '1'), mindest_uebung: 1 })
                      setShowAddSongForm(false)
                    } catch {}
                    setSavingNewSong(false)
                  }}
                  className="text-xs px-3 py-1 rounded"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    opacity: (!newSongForm.titel || !newSongForm.interpret || savingNewSong) ? 0.5 : 1
                  }}
                >
                  {savingNewSong ? 'Speichern...' : 'Zur Datenbank'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SongManagement Modal */}
        <SongManagement isOpen={showSongMgmt} onClose={() => setShowSongMgmt(false)} />
      </div>

      {/* Zahlungsstatus */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>Zahlung</h3>
        {localZahlung === 'ja' ? (
          <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: 'var(--status-success)', color: 'white' }}>
            <span className="text-lg">&#10003;</span>
            <span className="font-medium">Zahlung läuft</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleZahlungUpdate('ja')}
              className="font-medium py-3 px-4 rounded-lg transition-colors text-sm"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}
            >
              JA
            </button>
            <button
              onClick={() => handleZahlungUpdate('nein')}
              className={localZahlung === 'nein'
                ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
                : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
              style={localZahlung === 'nein'
                ? { backgroundColor: 'var(--status-error)', color: 'white' }
                : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}
            >
              NEIN
            </button>
            <button
              onClick={() => handleZahlungUpdate('Paypal')}
              className={localZahlung === 'Paypal'
                ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
                : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
              style={localZahlung === 'Paypal'
                ? { backgroundColor: '#0070ba', color: 'white' }
                : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}
            >
              PAYPAL
            </button>
            <button
              onClick={() => handleZahlungUpdate('unbekannt')}
              className={localZahlung === 'unbekannt' || !localZahlung
                ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
                : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
              style={localZahlung === 'unbekannt' || !localZahlung
                ? { backgroundColor: 'var(--status-warning)', color: 'white' }
                : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}
            >
              OFFEN
            </button>
          </div>
        )}
      </div>

      {/* Schlagzeug Status */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>🥁 Schlagzeug</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleSchlagzeugUpdate('Ja')}
            className={student.hatSchlagzeug === 'Ja'
              ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
              : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
            style={student.hatSchlagzeug === 'Ja'
              ? { backgroundColor: 'var(--status-success)', color: 'white' }
              : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}
          >
            JA
          </button>
          <button
            onClick={() => handleSchlagzeugUpdate('Nein')}
            className={student.hatSchlagzeug === 'Nein'
              ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
              : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
            style={student.hatSchlagzeug === 'Nein'
              ? { backgroundColor: 'var(--status-error)', color: 'white' }
              : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}
          >
            NEIN
          </button>
          <button
            onClick={() => handleSchlagzeugUpdate('Unbekannt')}
            className={student.hatSchlagzeug === 'Unbekannt' || !student.hatSchlagzeug
              ? 'font-medium py-3 px-4 rounded-lg shadow-md text-white text-sm'
              : 'font-medium py-3 px-4 rounded-lg transition-colors text-sm'}
            style={student.hatSchlagzeug === 'Unbekannt' || !student.hatSchlagzeug
              ? { backgroundColor: 'var(--status-warning)', color: 'white' }
              : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}
          >
            UNBEKANNT
          </button>
        </div>
      </div>

      {/* Anwesenheit heute */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold" style={{ color: '#ffffff' }}>Anwesenheit heute</h3>
          {attendanceStats.total > 0 && (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {attendanceStats.rate}% Anwesenheit (letzte 30 Tage)
            </span>
          )}
        </div>
        
        {todayAttendance ? (
          <div className="rounded-lg p-4 border-l-4 flex justify-between items-center" style={{
            backgroundColor: 'var(--accent-light)',
            borderLeftColor: getStatusColor(todayAttendance.status)
          }}>
            <div>
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {getStatusText(todayAttendance.status)}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Erfasst um {new Date(todayAttendance.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <button
              onClick={() => handleAttendanceUpdate('erschienen')}
              className="text-sm px-3 py-1 rounded transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              title="Anwesenheit zurücksetzen"
            >
              Zurücksetzen
            </button>
          </div>
        ) : (
          <div>
            <div className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              Standard: Erschienen (keine Aktion nötig)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAttendanceUpdate('vom_schueler_abgesagt')}
                className="font-medium py-2 px-3 rounded-lg transition-colors text-white text-sm"
                style={{ backgroundColor: 'var(--status-error)' }}
              >
                Schüler abgesagt
              </button>
              <button
                onClick={() => { handleAttendanceUpdate('vom_lehrer_abgesagt'); handleGuthabenUpdate(localGuthaben + student.unterrichtsdauer) }}
                className="font-medium py-2 px-3 rounded-lg transition-colors text-white text-sm"
                style={{ backgroundColor: 'var(--status-warning)' }}
              >
                Lehrer abgesagt
              </button>
              <button
                onClick={() => handleAttendanceUpdate('schulfrei')}
                className="font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                style={{
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-medium)'
                }}
              >
                Schulfrei
              </button>
              <button
                onClick={() => handleAttendanceUpdate('nicht_erschienen')}
                className="font-medium py-2 px-3 rounded-lg transition-colors text-white text-sm"
                style={{ backgroundColor: 'var(--text-primary)' }}
              >
                Nicht erschienen
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Minuten-Guthaben */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>⏱ Minuten-Guthaben</h3>
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--accent-light)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold" style={{ color: localGuthaben > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}>
              {localGuthaben} min
            </span>
            {localGuthaben > 0 && (
              <span className="text-sm px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: 'var(--status-warning)' }}>
                Ausstehend
              </span>
            )}
            {localGuthaben === 0 && (
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Kein Guthaben</span>
            )}
          </div>

          {localGuthaben > 0 && (
            <>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Nachholen — wähle die nachgeholten Minuten:</p>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((min) => (
                  <button
                    key={min}
                    onClick={() => handleGuthabenUpdate(localGuthaben - min)}
                    disabled={min > localGuthaben}
                    className="font-medium py-2 px-2 rounded-lg text-sm transition-colors"
                    style={min > localGuthaben
                      ? { backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', opacity: 0.4 }
                      : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}
                  >
                    −{min} min
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Einnahmen */}
      <div className="mb-6">
        <EarningsCard student={student} />
      </div>

      {/* Kontakt & Aktionen */}
      <div className="flex flex-wrap gap-3">
        {student.handynummer && (
          <div className="flex gap-2">
            <a
              href={getPhoneLink()}
              className="btn-secondary flex items-center gap-1 flex-1"
              title={`Anrufen: ${student.handynummer}`}
            >
              📞 Anrufen
            </a>
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer" 
              className="btn-primary flex items-center gap-1 flex-1"
              title={`WhatsApp: ${student.handynummer}`}
            >
              💬 WhatsApp
            </a>
          </div>
        )}
        
        {student.email && (
          <a
            href={getEmailLink()}
            className="btn-secondary flex items-center gap-2 w-full"
            title={`E-Mail: ${student.email}`}
          >
            ✉️ E-Mail senden
          </a>
        )}
        
        {student.vertragslink && (
          <a
            href={student.vertragslink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2"
          >
            Vertrag
          </a>
        )}
      </div>
    </div>
  )
}