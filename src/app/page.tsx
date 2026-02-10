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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Smart Teaching Assistant
            </h1>
            <p className="text-sm text-gray-600">
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
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getSyncIcon()}</span>
              <div className="text-sm">
                <div className="font-medium capitalize">{syncStatus.status}</div>
                {syncStatus.queueLength > 0 && (
                  <div className="text-gray-500">{syncStatus.queueLength} Updates</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        
        {/* Auto-Switch Status */}
        {autoSwitchStatus && (
          <div className="mb-6">
            {autoSwitchStatus.currentStudent ? (
              <div className="bg-blue-500 text-white p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-lg">
                      ▶️ Aktuell: {autoSwitchStatus.currentStudent.vorname} {autoSwitchStatus.currentStudent.nachname}
                    </div>
                    <div className="text-blue-100">
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
              <div className="bg-orange-500 text-white p-4 rounded-lg mb-4">
                <div className="font-bold text-lg">
                  ⏰ Wartezeit - Nächster: {autoSwitchStatus.nextStudent.vorname} {autoSwitchStatus.nextStudent.nachname}
                </div>
                <div className="text-orange-100">
                  {getCountdownText(autoSwitchStatus.minutesUntilNext)} • {autoSwitchStatus.nextStudent.unterrichtszeit}
                </div>
              </div>
            ) : (
              <div className="bg-gray-500 text-white p-4 rounded-lg mb-4">
                <div className="font-bold text-lg">
                  📅 Kein Unterricht zur aktuellen Zeit
                </div>
                <div className="text-gray-200">
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

        {/* Heutige Termine */}
        {todaysStudents.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
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
                  <div key={student.id} className="bg-white rounded-lg p-4 shadow border">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">
                          {student.vorname} {student.nachname}
                        </div>
                        <div className="text-sm text-gray-600">
                          {student.unterrichtszeit} • {student.buch}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          // Scroll to student card wenn es die aktuelle Karte ist
                          if (autoSwitchStatus?.currentStudent?.id === student.id) {
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }
                        }}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      >
                        {autoSwitchStatus?.currentStudent?.id === student.id ? '👆 Aktuell' : '▶️ Start'}
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
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔄</div>
            <div className="text-xl font-medium text-gray-600">
              Schüler werden geladen...
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