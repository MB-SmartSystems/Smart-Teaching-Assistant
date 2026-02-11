'use client'

import { SchülerApp } from '@/lib/baserow'
import { Song, StudentProgress, generateSongSuggestions, mockSongs, parseExerciseToNumber } from '@/lib/songs'

interface SongSuggestionsProps {
  student: SchülerApp
}

export default function SongSuggestions({ student }: SongSuggestionsProps) {
  // Schüler-Fortschritt aus Schüler-Daten erstellen
  const studentProgress: StudentProgress = {
    currentBook: student.buch || 'Essential Beats',
    currentPage: parseInt(student.seite || '1'),
    currentExercise: student.übung || '1',
    techniqueFocus: student.wichtigerFokus || undefined
  }

  // Liedvorschläge generieren
  const suggestions = generateSongSuggestions(studentProgress, mockSongs).slice(0, 3) // Nur top 3

  if (suggestions.length === 0) {
    return null // Keine Vorschläge = keine Anzeige
  }

  const getDifficultyColor = (difficulty: 'perfect' | 'easy' | 'challenging') => {
    switch (difficulty) {
      case 'perfect': return 'var(--status-success)'
      case 'easy': return 'var(--status-warning)'  
      case 'challenging': return 'var(--status-error)'
    }
  }

  return (
    <div className="rounded-lg p-5 border-l-4" style={{ 
      backgroundColor: 'var(--primary-light)', 
      borderLeftColor: 'var(--primary)' 
    }}>
      <h3 className="font-semibold mb-3" style={{ color: '#ffffff' }}>
        🎵 Liedvorschläge für den aktuellen Stand
      </h3>
      
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div 
            key={suggestion.song.id}
            className="rounded-lg p-3 border-l-2"
            style={{
              backgroundColor: 'var(--accent-light)',
              borderLeftColor: getDifficultyColor(suggestion.difficulty)
            }}
          >
            <div className="flex justify-between items-start mb-1">
              <div className="flex-1">
                <div className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                  {suggestion.song.title}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {suggestion.song.artist}
                </div>
              </div>
              
              <div className="text-xs px-2 py-1 rounded" style={{
                backgroundColor: getDifficultyColor(suggestion.difficulty),
                color: 'white'
              }}>
                {suggestion.difficulty === 'perfect' ? 'Perfekt' :
                 suggestion.difficulty === 'easy' ? 'Einfach' : 'Schwer'}
              </div>
            </div>

            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Ab Seite {suggestion.song.minPage}, Übung {suggestion.song.minExercise}
              {suggestion.song.techniqueFocus.length > 0 && 
                ` • ${suggestion.song.techniqueFocus.slice(0, 2).join(', ')}`
              }
            </div>

            {suggestion.song.notes && (
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                💡 {suggestion.song.notes.slice(0, 60)}...
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
        Basierend auf: {studentProgress.currentBook}, Seite {studentProgress.currentPage}, Übung {studentProgress.currentExercise}
      </div>
    </div>
  )
}