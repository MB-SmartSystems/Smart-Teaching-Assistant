'use client'

import { SchülerApp } from '@/lib/baserow'
import { Song, StudentProgress, generateSongSuggestions, mockSongs, parseExerciseToNumber } from '@/lib/songs'

interface SongSuggestionsProps {
  student: SchülerApp
}

export default function SongSuggestions({ student }: SongSuggestionsProps) {
  // Hauptbuch (Buch 1) Fortschritt
  const book1Progress: StudentProgress = {
    currentBook: student.buch || 'Essential Beats',
    currentPage: parseInt(student.seite || '1'),
    currentExercise: student.übung || '1',
    techniqueFocus: student.wichtigerFokus || undefined
  }

  // Buch 2 Fortschritt (falls vorhanden)
  const book2Progress: StudentProgress | null = student.buch2 ? {
    currentBook: student.buch2,
    currentPage: parseInt(student.seite2 || '1'),
    currentExercise: student.übung2 || '1',
    techniqueFocus: student.wichtigerFokus || undefined
  } : null

  // Liedvorschläge für beide Bücher generieren
  const book1Suggestions = generateSongSuggestions(book1Progress, mockSongs).slice(0, 2)
  const book2Suggestions = book2Progress ? generateSongSuggestions(book2Progress, mockSongs).slice(0, 2) : []
  
  // Kombinierte Vorschläge (maximal 3)
  const suggestions = [...book1Suggestions, ...book2Suggestions].slice(0, 3)

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
        🎵 Liedvorschläge ({student.buch}{student.buch2 ? ` + ${student.buch2}` : ''})
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
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  📖 {suggestion.song.book}
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