'use client'

import { useEffect, useState } from 'react'
import { SchülerApp } from '@/lib/baserow'
import { getAutoSwitchStatus, getCountdownText, AutoSwitchResult } from '@/lib/autoSwitch'
import { OfflineStorageManager } from '@/lib/offlineSync'
import SchülerCard from '@/components/SchülerCard'

export default function Home() {
  const [students, setStudents] = useState<SchülerApp[]>([])
  const [autoSwitchStatus, setAutoSwitchStatus] = useState<AutoSwitchResult | null>(null)
  const [syncStatus, setSyncStatus] = useState<{ status: string; queueLength: number }>({ status: 'loading', queueLength: 0 })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null)

  // Initialisierung
  useEffect(() => {
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
    updateAutoSwitch()
    
    const interval = setInterval(updateAutoSwitch, 30000)
    return () => clearInterval(interval)
  }, [students])

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
    if (students.length === 0) return
    
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

  // Aktueller deutscher Wochentag
  const getCurrentDay = () => {
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
    return days[currentTime.getDay()]
  }

  // Heutige Schüler
  const todaysStudents = students.filter(s => s.unterrichtstag === getCurrentDay())

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--light-gray)' }}>
      {/* Header */}
      <header className="bg-white card-shadow border-b p-6">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--dark-text)' }}>
              Smart Teaching Assistant
            </h1>
            <p className="text-base font-medium" style={{ color: 'var(--warm-gray)' }}>
              {getCurrentDay()}, {currentTime.toLocaleDateString('de-DE', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
              })} • {currentTime.toLocaleTimeString('de-DE', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getSyncIcon()}</span>
              <div className="text-sm">
                <div className="font-semibold capitalize" style={{ color: 'var(--dark-text)' }}>
                  {syncStatus.status}
                </div>
                {syncStatus.queueLength > 0 && (
                  <div className="text-orange-600 font-medium">
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
        {autoSwitchStatus && (
          <div className="mb-6">
            {autoSwitchStatus.currentStudent ? (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg mb-4 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-xl">
                      ▶️ Aktuell: {autoSwitchStatus.currentStudent.vorname} {autoSwitchStatus.currentStudent.nachname}
                    </div>
                    <div className="text-blue-100 text-lg font-medium">
                      {autoSwitchStatus.currentStudent.unterrichtszeit}
                    </div>
                  </div>
                  
                  {autoSwitchStatus.nextStudent && autoSwitchStatus.minutesUntilNext > 0 && (
                    <div className="text-right text-blue-100">
                      <div className="text-sm">Nächster:</div>
                      <div className="font-medium">
                        {autoSwitchStatus.nextStudent.vorname} {getCountdownText(autoSwitchStatus.minutesUntilNext)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : autoSwitchStatus.isWaitingTime && autoSwitchStatus.nextStudent ? (
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg mb-4 shadow-lg">
                <div className="font-bold text-xl">
                  ⏰ Wartezeit - Nächster: {autoSwitchStatus.nextStudent.vorname} {autoSwitchStatus.nextStudent.nachname}
                </div>
                <div className="text-orange-100 text-lg font-medium">
                  {getCountdownText(autoSwitchStatus.minutesUntilNext)} • {autoSwitchStatus.nextStudent.unterrichtszeit}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white p-4 rounded-lg mb-4 shadow-lg">
                <div className="font-bold text-xl">
                  📅 Kein Unterricht zur aktuellen Zeit
                </div>
                <div className="text-gray-200 text-lg font-medium">
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
            <div className="bg-blue-50 border-l-4 border-l-blue-500 rounded-lg p-5 mb-6 card-shadow">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-blue-800">📖 Schüler-Details</h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="btn-secondary text-gray-600 hover:text-gray-800"
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
        {todaysStudents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--dark-text)' }}>
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
                  <div key={student.id} className="bg-white rounded-xl card-shadow-lg p-5 border hover:border-blue-300 transition-all duration-200">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 text-xl mb-1">
                          {student.vorname} {student.nachname}
                        </div>
                        <div className="text-base text-gray-700 font-semibold mb-1">
                          {student.unterrichtszeit} • {student.buch || 'Kein Buch'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Zahlung: <span className={`font-medium ${
                            student.zahlungStatus === 'ja' ? 'text-green-600' :
                            student.zahlungStatus === 'nein' ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            {student.zahlungStatus || 'unbekannt'}
                          </span>
                          {student.monatlicherbetrag && (
                            <> • {student.monatlicherbetrag}€</>
                          )}
                        </div>
                        {student.wichtigerFokus && (
                          <div className="text-sm text-blue-700 mt-1 font-medium">
                            🎯 {student.wichtigerFokus}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStudent(student.id)
                        }}
                        className="btn-primary ml-4"
                        style={{ backgroundColor: autoSwitchStatus?.currentStudent?.id === student.id ? 'var(--success-green)' : 'var(--primary-blue)' }}
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
        {students.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl card-shadow-lg p-8 max-w-md mx-auto">
              <div className="text-6xl mb-4">🔄</div>
              <div className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                Schüler werden geladen...
              </div>
              <div className="text-base" style={{ color: 'var(--warm-gray)' }}>
                Verbindung zu Baserow wird hergestellt
              </div>
            </div>
          </div>
        )}

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