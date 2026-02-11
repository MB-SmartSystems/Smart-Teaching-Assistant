'use client'

import { SchülerApp } from '@/lib/baserow'
import { useState } from 'react'
import { useOfflineSync } from '@/lib/offlineSync'
import BookDropdown from './BookDropdown'
import EarningsCard from './EarningsCard'
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
  
  const [localValues, setLocalValues] = useState({
    buch: student.buch,
    seite: student.seite,
    übung: student.übung,
    übungVon: initialUebungen.von,
    übungBis: initialUebungen.bis,
    wichtigerFokus: student.wichtigerFokus,
    aktuelleLieder: student.aktuelleLieder
  })

  // Anwesenheits-State
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
        text: `Geburtstag seit letzter Stunde (vor ${daysSince} Tag${daysSince !== 1 ? 'en' : ''}) 🎂`, 
        color: 'var(--primary)',
        priority: 2 
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
  const handleFieldUpdate = async (field: 'buch' | 'seite' | 'übung' | 'wichtigerFokus' | 'aktuelleLieder', value: string) => {
    setLocalValues(prev => ({ ...prev, [field]: value }))
    
    try {
      await updateField(student.id, field, value)
    } catch (error) {
      console.error(`Fehler beim Update von ${field}:`, error)
      // TODO: Error Toast anzeigen
    }
  }

  // Nummer-Update Handler (für Seite)
  const handleNumberUpdate = async (field: 'seite', change: number) => {
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
  const handleZahlungUpdate = async (status: 'ja' | 'nein' | 'offen') => {
    try {
      await updateField(student.id, 'zahlungStatus', status)
    } catch (error) {
      console.error('Fehler beim Update des Zahlungsstatus:', error)
    }
  }

  // Anwesenheits-Update
  const handleAttendanceUpdate = (status: AttendanceStatus) => {
    const today = getTodayString()
    setAttendance(student.id, today, status)
    // Trigger re-render durch State-Update
    setLocalValues(prev => ({ ...prev })) // Dummy update für re-render
  }

  // WhatsApp Link generieren
  const getWhatsAppLink = () => {
    if (!student.handynummer) return '#'
    const cleanNumber = student.handynummer.replace(/[^\d+]/g, '')
    return `whatsapp://send?phone=${cleanNumber}&text=Hallo%20${student.ansprechpartner},%20`
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
      backgroundColor: isActive ? 'var(--status-active-bg)' : '#354F52'
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
        
        {birthdayStatus && (
          <span className="px-3 py-2 rounded-lg text-white text-sm font-bold" style={{
            backgroundColor: birthdayStatus.color
          }}>
            {birthdayStatus.text}
          </span>
        )}
      </div>

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

        {/* Seite und Übung - Nummer-Controls */}
        <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--accent-light)' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#ffffff' }}>Aktueller Stand</h3>
          
          <div className="grid grid-cols-1 gap-6">
            
            {/* Seite */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: '#cbd5e1' }}>Seite</label>
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={() => handleNumberUpdate('seite', -1)}
                  className="flex items-center justify-center w-10 h-10 font-semibold text-lg rounded-lg transition-colors border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                >
                  −
                </button>
                
                <div 
                  className="flex items-center justify-center w-16 h-10 font-semibold text-lg cursor-pointer rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)',
                    border: `1px solid var(--border-medium)`,
                    color: 'var(--text-primary)'
                  }}
                  onClick={() => setEditingField('seite')}
                >
                  {editingField === 'seite' ? (
                    <input
                      type="number"
                      value={localValues.seite}
                      onChange={(e) => setLocalValues(prev => ({ ...prev, seite: e.target.value }))}
                      onBlur={() => {
                        handleFieldUpdate('seite', localValues.seite)
                        setEditingField(null)
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      className="w-16 text-center font-bold text-lg border-none outline-none bg-transparent"
                      autoFocus
                    />
                  ) : (
                    localValues.seite || '1'
                  )}
                </div>
                
                <button
                  onClick={() => handleNumberUpdate('seite', 1)}
                  className="flex items-center justify-center w-10 h-10 font-semibold text-lg rounded-lg transition-colors border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                >
                  +
                </button>
              </div>
            </div>

            {/* Übungen - Von/Bis Zahlen-Controls */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: '#cbd5e1' }}>Übungen</label>
              
              <div className="flex items-center gap-3">
                
                {/* Von */}
                <div className="flex-1">
                  <div className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Von</div>
                  <div className="flex items-center gap-2 justify-center">
                    <button
                      onClick={() => handleUebungUpdate('übungVon', -1)}
                      className="flex items-center justify-center w-8 h-8 font-semibold text-sm rounded-lg transition-colors border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-medium)',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    >
                      −
                    </button>
                    
                    <div 
                      className="flex items-center justify-center w-12 h-8 font-semibold text-lg rounded-lg transition-colors"
                      style={{ 
                        backgroundColor: 'var(--bg-primary)',
                        border: `1px solid var(--border-medium)`,
                        color: 'var(--text-primary)'
                      }}
                    >
                      {localValues.übungVon}
                    </div>
                    
                    <button
                      onClick={() => handleUebungUpdate('übungVon', 1)}
                      className="flex items-center justify-center w-8 h-8 font-semibold text-sm rounded-lg transition-colors border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-medium)',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Bis */}
                <div className="flex-1">
                  <div className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Bis</div>
                  <div className="flex items-center gap-2 justify-center">
                    <button
                      onClick={() => handleUebungUpdate('übungBis', -1)}
                      className="flex items-center justify-center w-8 h-8 font-semibold text-sm rounded-lg transition-colors border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-medium)',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    >
                      −
                    </button>
                    
                    <div 
                      className="flex items-center justify-center w-12 h-8 font-semibold text-lg rounded-lg transition-colors"
                      style={{ 
                        backgroundColor: 'var(--bg-primary)',
                        border: `1px solid var(--border-medium)`,
                        color: 'var(--text-primary)'
                      }}
                    >
                      {localValues.übungBis}
                    </div>
                    
                    <button
                      onClick={() => handleUebungUpdate('übungBis', 1)}
                      className="flex items-center justify-center w-8 h-8 font-semibold text-sm rounded-lg transition-colors border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-medium)',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                💡 Ergebnis: Übungen {localValues.übungVon === localValues.übungBis ? localValues.übungVon : `${localValues.übungVon} bis ${localValues.übungBis}`}
              </div>
            </div>
          </div>
        </div>

        {/* Wichtiger Fokus */}
        <div className="rounded-lg p-5 border-l-4" style={{ 
          backgroundColor: 'var(--primary-light)', 
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

        {/* Aktuelle Lieder */}
        <div className="rounded-lg p-5 border-l-4" style={{ 
          backgroundColor: 'var(--status-success-bg)', 
          borderLeftColor: 'var(--status-success)' 
        }}>
          <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>Heute gelernt</h3>
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
              className="w-full p-3 border-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:border-transparent"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--primary)'
              } as React.CSSProperties}
              placeholder="Z.B. We will rock you, Back in black"
              autoFocus
            />
          ) : (
            <div 
              className="cursor-pointer p-3 rounded-lg border-2 border-dashed transition-colors"
              style={{
                backgroundColor: 'var(--accent-light)',
                borderColor: 'var(--border-medium)'
              }}
              onClick={() => setEditingField('aktuelleLieder')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
            >
              {localValues.aktuelleLieder || 'Neue Lieder hinzufügen...'}
            </div>
          )}
        </div>
      </div>

      {/* Zahlungsstatus */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>Zahlung</h3>
        <div className="flex gap-3">
          <button
            onClick={() => handleZahlungUpdate('ja')}
            className={student.zahlungStatus === 'ja' 
              ? 'font-medium py-3 px-5 rounded-lg shadow-md text-white'
              : 'font-medium py-3 px-5 rounded-lg transition-colors'}
            style={student.zahlungStatus === 'ja' 
              ? { backgroundColor: 'var(--status-success)', color: 'white' }
              : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: `1px solid var(--border-medium)` }}
          >
            JA
          </button>
          <button
            onClick={() => handleZahlungUpdate('nein')}
            className={student.zahlungStatus === 'nein' 
              ? 'font-medium py-3 px-5 rounded-lg shadow-md text-white'
              : 'font-medium py-3 px-5 rounded-lg transition-colors'}
            style={student.zahlungStatus === 'nein' 
              ? { backgroundColor: 'var(--status-error)', color: 'white' }
              : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: `1px solid var(--border-medium)` }}
          >
            NEIN
          </button>
          <button
            onClick={() => handleZahlungUpdate('offen')}
            className={student.zahlungStatus === 'offen' || student.zahlungStatus === 'unbekannt' 
              ? 'font-medium py-3 px-5 rounded-lg shadow-md text-white'
              : 'font-medium py-3 px-5 rounded-lg transition-colors'}
            style={student.zahlungStatus === 'offen' || student.zahlungStatus === 'unbekannt' 
              ? { backgroundColor: 'var(--status-warning)', color: 'white' }
              : { backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: `1px solid var(--border-medium)` }}
          >
            OFFEN
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
            <div className="flex gap-2">
              <button
                onClick={() => handleAttendanceUpdate('krank')}
                className="font-medium py-2 px-4 rounded-lg transition-colors text-white"
                style={{ backgroundColor: 'var(--status-warning)' }}
              >
                Krank
              </button>
              <button
                onClick={() => handleAttendanceUpdate('abgesagt')}
                className="font-medium py-2 px-4 rounded-lg transition-colors"
                style={{ 
                  backgroundColor: 'var(--accent-light)', 
                  color: 'var(--text-primary)', 
                  border: `1px solid var(--border-medium)` 
                }}
              >
                Abgesagt
              </button>
              <button
                onClick={() => handleAttendanceUpdate('nicht_erschienen')}
                className="font-medium py-2 px-4 rounded-lg transition-colors text-white"
                style={{ backgroundColor: 'var(--status-error)' }}
              >
                Nicht erschienen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Einnahmen */}
      <div className="mb-6">
        <EarningsCard student={student} />
      </div>

      {/* Kontakt & Aktionen */}
      <div className="flex flex-wrap gap-3">
        {student.handynummer && (
          <a
            href={getWhatsAppLink()}
            className="btn-primary flex items-center gap-2"
          >
            WhatsApp {student.ansprechpartner}
          </a>
        )}
        
        {student.email && (
          <a
            href={getEmailLink()}
            className="btn-primary flex items-center gap-2"
          >
            E-Mail
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