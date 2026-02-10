'use client'

import { useEffect, useState } from 'react'
import { getBookStats } from '@/lib/dynamicBooks'

export default function BookStats() {
  const [stats, setStats] = useState({
    baseBooks: 0,
    customBooks: 0,
    totalBooks: 0,
    customBooksList: [] as string[]
  })
  
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    setStats(getBookStats())
  }, [])

  if (stats.totalBooks === 0) return null

  return (
    <div className="bg-blue-50 border-l-4 border-l-blue-500 p-4 rounded-lg mb-4">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-2">
          <span className="text-blue-600 font-medium">📚 Bücher-Bibliothek</span>
          <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-sm font-bold">
            {stats.totalBooks}
          </span>
        </div>
        
        <span className="text-blue-400 text-sm">
          {showDetails ? '🔽' : '▶️'} {showDetails ? 'Weniger' : 'Details'}
        </span>
      </div>
      
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-700">Standard-Bücher:</span>
              <span className="ml-2">{stats.baseBooks}</span>
            </div>
            <div>
              <span className="font-medium text-blue-700">Hinzugefügte Bücher:</span>
              <span className="ml-2">{stats.customBooks}</span>
            </div>
          </div>
          
          {stats.customBooks > 0 && (
            <div className="mt-3">
              <div className="font-medium text-blue-700 mb-1">Von dir hinzugefügt:</div>
              <div className="text-sm text-blue-600">
                {stats.customBooksList.map((book, index) => (
                  <span key={book} className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded mr-1 mb-1">
                    ⭐ {book}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-3 text-xs text-blue-600">
            💡 Neue Bücher, die du hinzufügst, sind automatisch für alle Schüler verfügbar
          </div>
        </div>
      )}
    </div>
  )
}