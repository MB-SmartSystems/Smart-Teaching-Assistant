'use client'

import { useEffect, useState } from 'react'
import { SchülerApp } from '@/lib/baserow'
import { getAutoSwitchStatus, getCountdownText, AutoSwitchResult } from '@/lib/autoSwitch'
import { OfflineStorageManager } from '@/lib/offlineSync'
import SchülerCard from '@/components/SchülerCard'
import BookStats from '@/components/BookStats'

export default function Home() {
  const [students, setStudents] = useState<SchülerApp[]>([])
  const [autoSwitchStatus, setAutoSwitchStatus] = useState<AutoSwitchResult | null>(null)
  const [syncStatus, setSyncStatus] = useState<{ status: string; queueLength: number }>({ status: 'loading', queueLength: 0 })
  const [currentTime, setCurrentTime] = useState<Date | null>(null) // Null bis hydrated
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Initialisierung
  useEffect(() => {
    // Client-side hydration marker
    setIsClient(true)
    setCurrentTime(new Date())
    
    const storage = OfflineStorageManager.getInstance()
    storage.initialize().then(() => {
      loadStudents()
    })

    // Zeit alle 10 Sekunden aktualisieren
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 10000)

    return () => clearInterval(timeInterval)
  }, [])

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

  // Heutige Schüler - nur wenn Client hydrated und Zeit verfügbar
  const todaysStudents = isClient && currentTime ? students.filter(s => s.unterrichtstag === getCurrentDay()) : []

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-light)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--secondary-light)' }} className="shadow-lg border-b p-6">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
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
                'Lade...'
              )}
            </p>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getSyncIcon()}</span>
              <div className="text-sm">
                <div className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                  {syncStatus.status}
                </div>
                {syncStatus.queueLength > 0 && (
                  <div className="font-medium" style={{ color: 'var(--warning)' }}>
                    {syncStatus.queueLength} Updates
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        
        {/* Auto-Switch Status */}
        {isClient && autoSwitchStatus && (
          <div className="mb-6">
            {autoSwitchStatus.currentStudent ? (
              <div style={{ backgroundColor: 'var(--accent)', color: 'white' }} className="p-6 rounded-xl mb-6 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-2xl text-white">
                      ▶️ Aktuell: {autoSwitchStatus.currentStudent.vorname} {autoSwitchStatus.currentStudent.nachname}
                    </div>
                    <div className="text-white opacity-90 text-lg font-medium">
                      {autoSwitchStatus.currentStudent.unterrichtszeit}
                    </div>
                  </div>
                  
                  {autoSwitchStatus.nextStudent && autoSwitchStatus.minutesUntilNext > 0 && (
                    <div className="text-right text-white opacity-90">
                      <div className="text-sm">Nächster:</div>
                      <div className="font-medium">
                        {autoSwitchStatus.nextStudent.vorname} {getCountdownText(autoSwitchStatus.minutesUntilNext)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : autoSwitchStatus.isWaitingTime && autoSwitchStatus.nextStudent ? (
              <div style={{ backgroundColor: 'var(--warning)', color: 'white' }} className="p-6 rounded-xl mb-6 shadow-lg">
                <div className="font-semibold text-2xl text-white">
                  ⏰ Wartezeit - Nächster: {autoSwitchStatus.nextStudent.vorname} {autoSwitchStatus.nextStudent.nachname}
                </div>
                <div className="text-white opacity-90 text-lg font-medium">
                  {getCountdownText(autoSwitchStatus.minutesUntilNext)} • {autoSwitchStatus.nextStudent.unterrichtszeit}
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: 'var(--secondary)', color: 'white' }} className="p-6 rounded-xl mb-6 shadow-lg">
                <div className="font-semibold text-2xl text-white">
                  📅 Kein Unterricht zur aktuellen Zeit
                </div>
                <div className="text-white opacity-90 text-lg font-medium">
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
            <div style={{ backgroundColor: 'var(--accent-light)', borderLeftColor: 'var(--accent)' }} className="border-l-4 rounded-lg p-5 mb-6 shadow-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">📖 Schüler-Details</h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  ✖ Schließen
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
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              📅 Heute ({todaysStudents.length} Schüler)
            </h2>
            
            <div className="grid gap-4">
              {todaysStudents
                .sort((a, b) => {
                  const timeA = a.unterrichtszeit.split('-')[0] || '00:00'
                  const timeB = b.unterrichtszeit.split('-')[0] || '00:00'
                  return timeA.localeCompare(timeB)
                })
                .map(student => (
                  <div key={student.id} className={`bg-white rounded-xl shadow-lg border p-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${autoSwitchStatus?.currentStudent?.id === student.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 text-xl mb-1">
                          {student.vorname} {student.nachname}
                        </div>
                        <div className="text-base text-gray-900 font-semibold mb-1">
                          {student.unterrichtszeit} • {student.buch || 'Kein Buch'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Zahlung: <span className={`font-medium ${
                            student.zahlungStatus === 'ja' ? 'text-success' :
                            student.zahlungStatus === 'nein' ? 'text-error' : 'text-warning'
                          }`}>
                            {student.zahlungStatus || 'unbekannt'}
                          </span>
                          {student.monatlicherbetrag && (
                            <> • {student.monatlicherbetrag}€</>
                          )}
                        </div>
                        {student.wichtigerFokus && (
                          <div className="text-sm mt-1 font-medium" style={{ color: 'var(--primary-green)' }}>
                            🎯 {student.wichtigerFokus}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStudent(student.id)
                        }}
                        className={autoSwitchStatus?.currentStudent?.id === student.id 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-md ml-4' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-md ml-4'}
                      >
                        {autoSwitchStatus?.currentStudent?.id === student.id ? '👆 Aktuell' : '▶️ Details'}
                      </button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Loading State */}
        {(!isClient || students.length === 0) && (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-lg border p-8 max-w-md mx-auto">
              <div className="text-6xl mb-4">🔄</div>
              <div className="text-2xl font-bold mb-2 text-gray-900">
                Schüler werden geladen...
              </div>
              <div className="text-base text-gray-600">
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