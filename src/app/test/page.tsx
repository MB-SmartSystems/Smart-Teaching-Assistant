'use client'

import { useEffect, useState } from 'react'

export default function TestPage() {
  const [apiTest, setApiTest] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/test')
      .then(res => res.json())
      .then(data => {
        setApiTest(data)
        setLoading(false)
      })
      .catch(error => {
        setApiTest({ success: false, error: String(error) })
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <div>Teste Baserow-Verbindung...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            🎯 Smart Teaching Assistant - Test
          </h1>
          <p className="text-gray-600">Funktionalitätstest der Schüler-App</p>
        </header>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📡 Baserow API Test</h2>
          
          {apiTest?.success ? (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="flex items-center text-green-800">
                <span className="text-2xl mr-2">✅</span>
                <div>
                  <div className="font-bold">Verbindung erfolgreich!</div>
                  <div className="text-sm">
                    {apiTest.count} Schüler gefunden • 
                    Erster Schüler: {apiTest.firstStudent}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="flex items-center text-red-800">
                <span className="text-2xl mr-2">❌</span>
                <div>
                  <div className="font-bold">Verbindung fehlgeschlagen</div>
                  <div className="text-sm font-mono bg-red-100 p-2 mt-2 rounded">
                    {apiTest?.error || 'Unbekannter Fehler'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📱 App Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="font-bold text-blue-800">✅ Auto-Switch</div>
              <div className="text-sm text-blue-600">
                Erkennt aktuellen Schüler basierend auf Zeit und Tag
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="font-bold text-green-800">✅ Offline-Support</div>
              <div className="text-sm text-green-600">
                Updates werden lokal gespeichert und später synchronisiert
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded p-4">
              <div className="font-bold text-purple-800">✅ Wichtiger Fokus</div>
              <div className="text-sm text-purple-600">
                Technikübungen und Verbesserungsbereich pro Schüler
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded p-4">
              <div className="font-bold text-orange-800">✅ Geburtstags-Alerts</div>
              <div className="text-sm text-orange-600">
                Automatische Benachrichtigungen für Schüler-Geburtstage
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🚀 Nächste Schritte</h2>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Next.js App Setup komplett</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Baserow API Integration funktional</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Auto-Switch Logik implementiert</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-500 mr-2">⏳</span>
              <span>Haupt-UI testen und debuggen</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 mr-2">○</span>
              <span>Lead-Management hinzufügen</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 mr-2">○</span>
              <span>Deployment auf Vercel</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/"
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 inline-block"
          >
            🏠 Zur Haupt-App
          </a>
        </div>
      </div>
    </div>
  )
}