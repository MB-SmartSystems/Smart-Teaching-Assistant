'use client'

import { useEffect, useState } from 'react'
import { SchülerApp } from '@/lib/baserow'
import { getAutoSwitchStatus, getCountdownText, AutoSwitchResult } from '@/lib/autoSwitch'
import { OfflineStorageManager } from '@/lib/offlineSync'
import { authenticate, isAuthenticated as checkAuth, logout as doLogout, refreshSession } from '@/lib/auth'
import SchülerCard from '@/components/SchülerCard'
import SchülerCardCompact from '@/components/SchülerCardCompact'
import BookStats from '@/components/BookStats'
import EarningsOverview from '@/components/EarningsOverview'
import Login from '@/components/Login'
import { getTodayAttendance } from '@/lib/attendance'
import { FlexKarte, fetchFlexKarten, getRestStunden } from '@/lib/flexKarten'
import SongManagement from '@/components/SongManagement'
import FlexKartenDashboard from '@/components/FlexKartenDashboard'
import PreiserhoehungsDashboard from '@/components/PreiserhoehungsDashboard'
import AllStudentsModal from '@/components/AllStudentsModal'
import { ToastProvider } from '@/components/Toast'
import AufgabenWidget from '@/components/AufgabenWidget'
import { calcAge, hadRecentBirthday } from '@/lib/birthday'

export default function Home() {
  const [students, setStudents] = useState<SchülerApp[]>([])
  const [autoSwitchStatus, setAutoSwitchStatus] = useState<AutoSwitchResult | null>(null)
  const [syncStatus, setSyncStatus] = useState<{ status: string; queueLength: number }>({ status: 'loading', queueLength: 0 })
  const [currentTime, setCurrentTime] = useState<Date | null>(null) // Null bis hydrated
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [showSongManagement, setShowSongManagement] = useState(false)
  const [showAllStudents, setShowAllStudents] = useState(false)
  const [flexKarten, setFlexKarten] = useState<FlexKarte[]>([])
  const [showFlexSchueler, setShowFlexSchueler] = useState(true)
  
  // Authentifizierung
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginError, setLoginError] = useState<string | undefined>()
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  // Auth-Initialisierung
  useEffect(() => {
    setIsClient(true)

    // Auth-Status async prüfen
    checkAuth().then(authenticated => {
      setIsAuthenticated(authenticated)
      setIsAuthChecked(true)
    })
  }, [])

  // App-Daten laden wenn authentifiziert
  useEffect(() => {
    if (!isAuthenticated) return

    setCurrentTime(new Date())

    // App-Daten laden
    const storage = OfflineStorageManager.getInstance()
    storage.initialize().then(() => {
      loadStudents()
    })

    // FlexKarten laden
    fetchFlexKarten().then(setFlexKarten)

    // Zeit alle 30 Sekunden aktualisieren (Performance optimiert)
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
      refreshSession()
    }, 30000)
    
    // Auto-Switch Status alle 60 Sekunden neu berechnen (nicht bei jedem Tick)
    const autoSwitchInterval = setInterval(() => {
      if (students.length > 0) {
        const status = getAutoSwitchStatus(students, 5)
        setAutoSwitchStatus(status)
      }
    }, 60000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(autoSwitchInterval)
    }
  }, [isAuthenticated])

  // Auto-Switch Status bei Änderungen sofort aktualisieren
  useEffect(() => {
    if (isClient && currentTime && students.length > 0) {
      updateAutoSwitch()
    }
  }, [students, isClient, currentTime])

  // Schüler laden
  const loadStudents = async () => {
    try {
      const storage = OfflineStorageManager.getInstance()
      const loadedStudents = await storage.getStudents()
      setStudents(loadedStudents)
      
      const status = await storage.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Fehler beim Laden der Schüler:', error)
    }
  }

  // Auto-Switch Status berechnen
  const updateAutoSwitch = () => {
    if (students.length === 0 || !currentTime) return
    
    const status = getAutoSwitchStatus(students, 5)
    setAutoSwitchStatus(status)
  }

  // Sync-Status Icon
  const getSyncIcon = () => {
    switch (syncStatus.status) {
      case 'synced': return '✅'
      case 'syncing': return '🔄'
      case 'offline': return '⚠️'
      case 'error': return '❌'
      default: return '⏳'
    }
  }

  // Aktueller deutscher Wochentag - nur wenn Zeit verfügbar
  const getCurrentDay = (): string => {
    try {
      if (!currentTime || !isClient) return ''
      const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
      const dayIndex = currentTime.getDay()
      return days[dayIndex] || ''
    } catch (error) {
      console.warn('getCurrentDay error:', error)
      return ''
    }
  }

  // Login-Handler
  const handleLogin = async (password: string) => {
    const success = await authenticate(password)
    if (success) {
      setIsAuthenticated(true)
      setLoginError(undefined)
    } else {
      setLoginError('Falsches Passwort')
    }
  }

  // Logout-Handler
  const handleLogout = async () => {
    await doLogout()
    setIsAuthenticated(false)
    setStudents([])
    setAutoSwitchStatus(null)
    setSelectedStudent(null)
  }

  // Heutige Schüler - alle mit heutigem Unterrichtstag, auch Abgesagte (werden nur gedimmt)
  const todaysStudents = isClient && currentTime ? students.filter(s => {
    if (s.unterrichtstag !== getCurrentDay()) return false
    return true
  }) : []

  // Login-Screen anzeigen wenn nicht authentifiziert
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-8 h-8 border-4 border-t-primary rounded-full animate-spin" style={{ 
          borderColor: 'var(--border-medium)',
          borderTopColor: 'var(--primary)' 
        }}></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} error={loginError} />
  }

  return (
    <ToastProvider>
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }} className="border-b p-4 sm:p-5">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Smart Teaching Assistant
            </h1>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {isClient && currentTime ? (
                <>
                  {getCurrentDay()}, {currentTime.toLocaleDateString('de-DE', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })} • {currentTime.toLocaleTimeString('de-DE', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </>
              ) : (
                'Laden...'
              )}
            </p>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
              {/* Sync Status */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ 
                  backgroundColor: syncStatus.status === 'synced' ? 'var(--status-success)' :
                                 syncStatus.status === 'syncing' ? 'var(--status-warning)' :
                                 syncStatus.status === 'offline' ? 'var(--status-warning)' :
                                 'var(--status-neutral)'
                }}></div>
                <div className="text-sm">
                  <div className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                    {syncStatus.status === 'synced' ? 'Synchronisiert' :
                     syncStatus.status === 'syncing' ? 'Synchronisiert...' :
                     syncStatus.status === 'offline' ? 'Offline' :
                     syncStatus.status === 'error' ? 'Fehler' : 'Laden...'}
                  </div>
                  {syncStatus.queueLength > 0 && (
                    <div className="font-medium" style={{ color: 'var(--text-muted)' }}>
                      {syncStatus.queueLength} ausstehend
                    </div>
                  )}
                </div>
              </div>

              {/* Aufgaben Widget */}
              <AufgabenWidget students={students} />

              {/* Alle Schüler Button */}
              <button
                onClick={() => setShowAllStudents(true)}
                className="btn-primary text-sm"
                title="Komplette Schülerliste anzeigen"
              >
                📋 Alle Schüler
              </button>

              {/* Lieder-Datenbank Button */}
              <button
                onClick={() => setShowSongManagement(true)}
                className="btn-primary text-sm"
                title="Lieder-Datenbank öffnen"
              >
                🎵 Lieder
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
                title="Abmelden"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-3 sm:p-6 max-w-6xl mx-auto">
        
        {/* Schüler Detail Modal (Kompakt + Manual Save) */}
        {selectedStudent && students.find(s => s.id === selectedStudent) && (
          <SchülerCardCompact
            student={students.find(s => s.id === selectedStudent)!}
            isOpen={true}
            onClose={() => setSelectedStudent(null)}
          />
        )}

        {/* Heutige Termine — Bento-Grid */}
        {isClient && todaysStudents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Termine heute ({todaysStudents.length} Schüler)
            </h2>

            {(() => {
              const currentStudentId = autoSwitchStatus?.currentStudent?.id
              const now = currentTime ? `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}` : ''

              const sorted = [...todaysStudents].sort((a, b) => {
                if (currentStudentId !== undefined) {
                  if (a.id === currentStudentId) return -1
                  if (b.id === currentStudentId) return 1
                }
                const timeA = a.unterrichtszeit.split('-')[0] || '00:00'
                const timeB = b.unterrichtszeit.split('-')[0] || '00:00'
                return timeA.localeCompare(timeB)
              })

              const hasCurrent = !!currentStudentId

              return (
                <div className={`grid gap-3 ${hasCurrent ? 'grid-cols-3' : 'grid-cols-3'}`}>
                  {sorted.map(student => {
                    const isCurrent = student.id === currentStudentId
                    const startTime = student.unterrichtszeit.split('-')[0] || '00:00'
                    const isPast = now && startTime < now && !isCurrent
                    const todayAttendance = getTodayAttendance(student.id)
                    const isAbsent = todayAttendance && todayAttendance.status !== 'erschienen'

                    if (isCurrent) {
                      // Large card with blue accent — col-span-2
                      return (
                        <div
                          key={student.id}
                          onClick={() => setSelectedStudent(student.id)}
                          className="col-span-2 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
                          style={{
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(37,99,235,0.10) 100%)',
                            border: '2px solid rgba(59,130,246,0.5)',
                            boxShadow: '0 0 24px rgba(59,130,246,0.12)'
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.25)', color: '#60a5fa' }}>▶ JETZT</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{
                              backgroundColor: student.zahlungStatus === 'ja' ? 'rgba(16,185,129,0.2)' : student.zahlungStatus === 'nein' ? 'rgba(239,68,68,0.2)' : student.zahlungStatus === 'Paypal' ? 'rgba(59,130,246,0.2)' : 'rgba(107,114,128,0.2)',
                              color: student.zahlungStatus === 'ja' ? '#10b981' : student.zahlungStatus === 'nein' ? '#ef4444' : student.zahlungStatus === 'Paypal' ? '#3b82f6' : '#6b7280'
                            }}>
                              {student.zahlungStatus === 'ja' ? 'Zahlung OK' : student.zahlungStatus === 'nein' ? 'Keine Zahlung' : student.zahlungStatus === 'Paypal' ? 'PayPal' : 'Unbekannt'}
                            </span>
                          </div>
                          <div className="font-bold text-2xl mb-1" style={{ color: '#ffffff' }}>
                            {student.vorname} {student.nachname}
                          </div>
                          <div className="flex items-center gap-4 text-sm font-medium flex-wrap" style={{ color: 'rgba(255,255,255,0.75)' }}>
                            <span>⏰ {student.unterrichtszeit}</span>
                            {student.monatlicherbetrag && <span>💰 {student.monatlicherbetrag}€</span>}
                            {student.buch && <span>📖 {student.buch}</span>}
                            {student.geburtsdatum && hadRecentBirthday(student.geburtsdatum) && (
                              <span className="font-bold animate-pulse" style={{ color: '#fbbf24' }} title="Geburtstag in den letzten 14 Tagen!">🎂</span>
                            )}
                            {student.guthabenMinuten > 0 && (
                              <span className="font-semibold" style={{ color: '#34d399' }}>💳 {student.guthabenMinuten} Min</span>
                            )}
                            {student.hatSchlagzeug && student.hatSchlagzeug !== 'Unbekannt' && (
                              <span style={{ color: student.hatSchlagzeug === 'Ja' ? '#10b981' : '#ef4444' }}>
                                🥁 {student.hatSchlagzeug === 'Ja' ? 'Hat Schlagzeug' : 'Kein Schlagzeug'}
                              </span>
                            )}
                          </div>
                          {student.wichtigerFokus && (
                            <div className="text-sm mt-3 font-medium" style={{ color: '#60a5fa' }}>🎯 {student.wichtigerFokus}</div>
                          )}
                          {autoSwitchStatus?.nextStudent && autoSwitchStatus.minutesUntilNext > 0 && (
                            <div className="mt-3 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                              Nächster: {autoSwitchStatus.nextStudent.vorname} in {getCountdownText(autoSwitchStatus.minutesUntilNext)}
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Compact card — past (dimmed) or upcoming
                    return (
                      <div
                        key={student.id}
                        onClick={() => setSelectedStudent(student.id)}
                        className="rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 relative"
                        style={{
                          background: isAbsent ? 'rgba(20,20,20,0.5)' : isPast ? 'rgba(26,26,26,0.6)' : 'var(--bg-secondary)',
                          border: `1px solid ${isAbsent ? 'rgba(239,68,68,0.25)' : isPast ? 'rgba(64,64,64,0.5)' : 'var(--border-light)'}`,
                          opacity: isAbsent ? 0.5 : isPast ? 0.65 : 1
                        }}
                      >
                        {isAbsent && (
                          <span className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>✕ Abgesagt</span>
                        )}
                        {!isAbsent && isPast && (
                          <span className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981' }}>✓</span>
                        )}
                        <div className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                          {student.vorname} {student.nachname}
                        </div>
                        <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
                          <span>⏰ {student.unterrichtszeit}</span>
                          {student.monatlicherbetrag && <span>💰 {student.monatlicherbetrag}€</span>}
                          {student.geburtsdatum && hadRecentBirthday(student.geburtsdatum) && (
                            <span className="animate-pulse" style={{ color: '#fbbf24' }}>🎂</span>
                          )}
                          {student.guthabenMinuten > 0 && (
                            <span style={{ color: '#34d399' }}>💳 {student.guthabenMinuten} Min</span>
                          )}
                        </div>
                        {student.wichtigerFokus && (
                          <div className="text-xs mt-1.5" style={{ color: 'var(--primary)' }}>🎯 {student.wichtigerFokus}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* Flex-Karten-Schüler (ohne festen Termin) */}
        {isClient && flexKarten.length > 0 && (() => {
          const currentDay = getCurrentDay()
          const activeFlexKarten = flexKarten.filter(k => k.Status?.value === 'Aktiv')
          // Schüler-IDs die eine aktive FlexKarte haben
          const flexSchuelerIds = new Set(activeFlexKarten.map(k => k.Schueler_Link?.[0]?.id).filter(Boolean))
          // Schüler die FlexKarte haben ABER keinen festen Termin heute
          const flexSchueler = students.filter(s =>
            flexSchuelerIds.has(s.id) && s.unterrichtstag !== currentDay
          )

          if (flexSchueler.length === 0) return null

          return (
            <div className="mb-8">
              <button
                onClick={() => setShowFlexSchueler(!showFlexSchueler)}
                className="text-2xl font-bold mb-4 flex items-center gap-2 w-full text-left"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>{showFlexSchueler ? '▼' : '▶'}</span>
                🎫 Flex-Karten-Schüler ({flexSchueler.length})
              </button>
              {showFlexSchueler && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {flexSchueler.map(student => {
                    const karte = activeFlexKarten.find(k => k.Schueler_Link?.[0]?.id === student.id)
                    const restStunden = karte ? getRestStunden(karte) : 0
                    const gueltigBis = karte?.Gueltig_bis
                    return (
                      <div
                        key={student.id}
                        onClick={() => setSelectedStudent(student.id)}
                        className="rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 border"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: restStunden < 1 ? '#ef4444' : 'var(--border-light)',
                        }}
                      >
                        <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {student.vorname} {student.nachname}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span style={{ color: restStunden < 1 ? '#ef4444' : '#10b981' }}>
                            ⏱ {restStunden.toFixed(1)} Std
                          </span>
                          {gueltigBis && (
                            <span style={{ color: 'var(--text-muted)' }}>
                              bis {new Date(gueltigBis).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* Einnahmen-Übersicht */}
        {isClient && students.length > 0 && (
          <EarningsOverview students={students} />
        )}

        {/* Flex-Karten Dashboard */}
        {isClient && <FlexKartenDashboard />}

        {/* Preiserhöhungs-Tracking */}
        {isClient && <PreiserhoehungsDashboard />}

        {/* Loading State */}
        {(!isClient || students.length === 0) && (
          <div className="text-center py-16">
            <div className="rounded-lg shadow-lg border p-8 max-w-md mx-auto" style={{ 
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-light)' 
            }}>
              <div className="w-8 h-8 mx-auto mb-4 border-4 border-t-primary rounded-full animate-spin" style={{ 
                borderColor: 'var(--border-medium)',
                borderTopColor: 'var(--primary)' 
              }}></div>
              <div className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Schüler werden geladen
              </div>
              <div className="text-base" style={{ color: 'var(--text-secondary)' }}>
                Verbindung zu Baserow wird hergestellt
              </div>
            </div>
          </div>
        )}

        {/* Bücher-Statistiken */}
        {isClient && <BookStats />}

      </main>

      {/* Lieder-Datenbank Modal */}
      <SongManagement 
        isOpen={showSongManagement}
        onClose={() => setShowSongManagement(false)}
      />

      {/* Alle Schüler Modal */}
      {showAllStudents && (
        <AllStudentsModal
          students={students}
          onClose={() => setShowAllStudents(false)}
          onStudentClick={(id) => {
            setShowAllStudents(false)
            setSelectedStudent(id)
          }}
        />
      )}
    </div>
    </ToastProvider>
  )
}