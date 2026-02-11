'use client'

import { useEffect, useState } from 'react'
import { SchülerApp } from '@/lib/baserow'
import { getAutoSwitchStatus, getCountdownText, AutoSwitchResult } from '@/lib/autoSwitch'
import { OfflineStorageManager } from '@/lib/offlineSync'
import { useAuth } from '@/lib/auth'
import SchülerCard from '@/components/SchülerCard'
import BookStats from '@/components/BookStats'
import EarningsOverview from '@/components/EarningsOverview'
import Login from '@/components/Login'

export default function Home() {
  const [students, setStudents] = useState<SchülerApp[]>([])
  const [autoSwitchStatus, setAutoSwitchStatus] = useState<AutoSwitchResult | null>(null)
  const [syncStatus, setSyncStatus] = useState<{ status: string; queueLength: number }>({ status: 'loading', queueLength: 0 })
  const [currentTime, setCurrentTime] = useState<Date | null>(null) // Null bis hydrated
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  // Authentifizierung
  const auth = useAuth()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginError, setLoginError] = useState<string | undefined>()
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  // Auth-Initialisierung
  useEffect(() => {
    setIsClient(true)
    
    // Auth-Status prüfen
    const authenticated = auth.isAuthenticated()
    setIsAuthenticated(authenticated)
    setIsAuthChecked(true)
    
    if (authenticated) {
      setCurrentTime(new Date())
      
      // App-Daten laden
      const storage = OfflineStorageManager.getInstance()
      storage.initialize().then(() => {
        loadStudents()
      })

      // Zeit alle 10 Sekunden aktualisieren
      const timeInterval = setInterval(() => {
        setCurrentTime(new Date())
        // Session bei Aktivität verlängern
        auth.refreshSession()
      }, 10000)

      return () => clearInterval(timeInterval)
    }
  }, [isAuthenticated])

  // Auto-Switch Status alle 30 Sekunden aktualisieren
  useEffect(() => {
    if (isClient && currentTime) {
      updateAutoSwitch()
      
      const interval = setInterval(updateAutoSwitch, 30000)
      return () => clearInterval(interval)
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
  const handleLogin = (password: string) => {
    const success = auth.authenticate(password)
    if (success) {
      setIsAuthenticated(true)
      setLoginError(undefined)
    } else {
      setLoginError('Falsches Passwort')
    }
  }

  // Logout-Handler
  const handleLogout = () => {
    auth.logout()
    setIsAuthenticated(false)
    setStudents([])
    setAutoSwitchStatus(null)
    setSelectedStudent(null)
  }

  // Heutige Schüler - nur wenn Client hydrated und Zeit verfügbar
  const todaysStudents = isClient && currentTime ? students.filter(s => s.unterrichtstag === getCurrentDay()) : []

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }} className="shadow-lg border-b p-6">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Smart Teaching Assistant
            </h1>
            <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
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
            <div className="flex items-center gap-4">
              {/* Sync Status */}
              <div className="flex items-center gap-3">
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

      <main className="p-6 max-w-6xl mx-auto">
        
        {/* Auto-Switch Status */}
        {isClient && autoSwitchStatus && (
          <div className="mb-6">
            {autoSwitchStatus.currentStudent ? (
              <div style={{ backgroundColor: 'var(--status-active)', color: 'white', borderColor: 'var(--status-active)' }} className="p-6 rounded-lg mb-6 shadow-md border-l-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-xl text-white">
                      Aktueller Schüler: {autoSwitchStatus.currentStudent.vorname} {autoSwitchStatus.currentStudent.nachname}
                    </div>
                    <div className="text-white text-base font-medium mt-1">
                      {autoSwitchStatus.currentStudent.unterrichtszeit}
                    </div>
                  </div>
                  
                  {autoSwitchStatus.nextStudent && autoSwitchStatus.minutesUntilNext > 0 && (
                    <div className="text-right text-white">
                      <div className="text-sm font-medium">Nächster Schüler:</div>
                      <div className="font-medium">
                        {autoSwitchStatus.nextStudent.vorname} {getCountdownText(autoSwitchStatus.minutesUntilNext)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : autoSwitchStatus.isWaitingTime && autoSwitchStatus.nextStudent ? (
              <div style={{ backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)', borderColor: 'var(--status-warning)' }} className="p-6 rounded-lg mb-6 shadow-md border-l-4">
                <div className="font-bold text-xl">
                  Wartezeit - Nächster: {autoSwitchStatus.nextStudent.vorname} {autoSwitchStatus.nextStudent.nachname}
                </div>
                <div className="text-base font-medium mt-1">
                  {getCountdownText(autoSwitchStatus.minutesUntilNext)} • {autoSwitchStatus.nextStudent.unterrichtszeit}
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: 'var(--status-neutral-bg)', color: 'var(--status-neutral)', borderColor: 'var(--status-neutral)' }} className="p-6 rounded-lg mb-6 shadow-md border-l-4">
                <div className="font-bold text-xl">
                  Kein Unterricht zur aktuellen Zeit
                </div>
                <div className="text-base font-medium mt-1">
                  {todaysStudents.length > 0 
                    ? `${todaysStudents.length} Schüler heute geplant`
                    : `Keine Schüler für ${getCurrentDay()} eingetragen`
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* Aktueller/Nächster Schüler Card */}
        {autoSwitchStatus?.currentStudent && (
          <div className="mb-6">
            <SchülerCard 
              student={autoSwitchStatus.currentStudent} 
              isActive={true}
            />
          </div>
        )}

        {/* Ausgewählter Schüler Detail-Card */}
        {selectedStudent && students.find(s => s.id === selectedStudent) && (
          <div className="mb-8">
            <div style={{ backgroundColor: 'var(--accent-light)', borderLeftColor: 'var(--primary)' }} className="border-l-4 rounded-lg p-5 mb-6 shadow-md">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Schüler-Details</h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="btn-secondary"
                >
                  Schließen
                </button>
              </div>
            </div>
            <SchülerCard 
              student={students.find(s => s.id === selectedStudent)!} 
              isActive={false}
            />
          </div>
        )}

        {/* Heutige Termine */}
        {isClient && todaysStudents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
              Heute ({todaysStudents.length} Schüler)
            </h2>
            
            <div className="grid gap-4">
              {todaysStudents
                .sort((a, b) => {
                  const timeA = a.unterrichtszeit.split('-')[0] || '00:00'
                  const timeB = b.unterrichtszeit.split('-')[0] || '00:00'
                  return timeA.localeCompare(timeB)
                })
                .map(student => (
                  <div key={student.id} className={`rounded-lg shadow-md border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${autoSwitchStatus?.currentStudent?.id === student.id ? 'border-l-4' : 'border-gray-200'}`} style={{
                    borderLeftColor: autoSwitchStatus?.currentStudent?.id === student.id ? 'var(--status-active)' : undefined,
                    backgroundColor: autoSwitchStatus?.currentStudent?.id === student.id ? 'var(--status-active-bg)' : '#354F52'
                  }}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-bold text-xl mb-1" style={{ color: 'var(--text-primary)' }}>
                          {student.vorname} {student.nachname}
                        </div>
                        <div className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                          {student.unterrichtszeit} • {student.buch || 'Kein Buch'}
                        </div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Zahlung: <span className="font-semibold" style={{
                            color: student.zahlungStatus === 'ja' ? 'var(--status-success)' :
                                   student.zahlungStatus === 'nein' ? 'var(--status-error)' : 'var(--status-warning)'
                          }}>
                            {student.zahlungStatus || 'unbekannt'}
                          </span>
                          {student.monatlicherbetrag && (
                            <> • {student.monatlicherbetrag}€</>
                          )}
                        </div>
                        {student.wichtigerFokus && (
                          <div className="text-sm mt-1 font-medium" style={{ color: 'var(--primary)' }}>
                            Fokus: {student.wichtigerFokus}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStudent(student.id)
                        }}
                        className={autoSwitchStatus?.currentStudent?.id === student.id 
                          ? 'btn-primary ml-4' 
                          : 'btn-secondary ml-4'}
                      >
                        {autoSwitchStatus?.currentStudent?.id === student.id ? 'Aktuell' : 'Details'}
                      </button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Einnahmen-Übersicht */}
        {isClient && students.length > 0 && (
          <EarningsOverview students={students} />
        )}

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

        {/* Debug Info (nur in Development) */}
        {process.env.NODE_ENV === 'development' && autoSwitchStatus && (
          <div className="mt-8 p-4 bg-gray-200 rounded text-xs">
            <details>
              <summary className="font-bold cursor-pointer">🔧 Debug Info</summary>
              <pre className="mt-2 overflow-x-auto">
                {JSON.stringify(autoSwitchStatus, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </main>
    </div>
  )
}