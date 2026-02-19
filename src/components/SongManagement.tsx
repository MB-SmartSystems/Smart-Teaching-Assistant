'use client'

import { useState } from 'react'
import { Song, SongSuggestion, StudentProgress, generateSongSuggestions, mockSongs } from '@/lib/songs'

interface SongManagementProps {
  isOpen: boolean
  onClose: () => void
}

export default function SongManagement({ isOpen, onClose }: SongManagementProps) {
  const [songs, setSongs] = useState<Song[]>(mockSongs)
  const [selectedTab, setSelectedTab] = useState<'suggestions' | 'manage'>('suggestions')
  const [newSong, setNewSong] = useState({
    title: '',
    artist: '',
    book: 'Essential Beats',
    minPage: 1,
    minExercise: '1',
    difficulty: 'anfaenger' as const,
    techniqueFocus: '',
    notes: ''
  })

  // Mock Schüler-Fortschritt (später aus Props)
  const mockStudentProgress: StudentProgress = {
    currentBook: 'Essential Beats',
    currentPage: 30,
    currentExercise: '12',
    techniqueFocus: 'Timing'
  }

  const suggestions = generateSongSuggestions(mockStudentProgress, songs)

  const addSong = () => {
    if (!newSong.title || !newSong.artist) return

    const song: Song = {
      id: Date.now(), // Temporäre ID
      title: newSong.title,
      artist: newSong.artist,
      book: newSong.book,
      minPage: newSong.minPage,
      minExercise: newSong.minExercise,
      difficulty: newSong.difficulty,
      techniqueFocus: newSong.techniqueFocus.split(',').map(t => t.trim()),
      notes: newSong.notes || undefined,
      active: true
    }

    setSongs([...songs, song])
    setNewSong({
      title: '',
      artist: '',
      book: 'Essential Beats', 
      minPage: 1,
      minExercise: '1',
      difficulty: 'anfaenger',
      techniqueFocus: '',
      notes: ''
    })
  }

  const getDifficultyColor = (difficulty: 'perfect' | 'easy' | 'challenging') => {
    switch (difficulty) {
      case 'perfect': return 'var(--status-success)'
      case 'easy': return 'var(--status-warning)'
      case 'challenging': return 'var(--status-error)'
    }
  }

  const getDifficultyText = (difficulty: 'perfect' | 'easy' | 'challenging') => {
    switch (difficulty) {
      case 'perfect': return 'Perfekt'
      case 'easy': return 'Einfach'
      case 'challenging': return 'Herausfordernd'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" style={{
        backgroundColor: 'var(--bg-secondary)'
      }}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b" style={{
          borderColor: 'var(--border-light)'
        }}>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            🎵 Lieder-Datenbank
          </h2>
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Schließen
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border-light)' }}>
          <button
            onClick={() => setSelectedTab('suggestions')}
            className={`px-6 py-3 font-medium transition-colors ${
              selectedTab === 'suggestions' 
                ? 'border-b-2 border-primary'
                : ''
            }`}
            style={{
              color: selectedTab === 'suggestions' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottomColor: selectedTab === 'suggestions' ? 'var(--primary)' : 'transparent'
            }}
          >
            Vorschläge
          </button>
          <button
            onClick={() => setSelectedTab('manage')}
            className={`px-6 py-3 font-medium transition-colors ${
              selectedTab === 'manage' 
                ? 'border-b-2 border-primary'
                : ''
            }`}
            style={{
              color: selectedTab === 'manage' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottomColor: selectedTab === 'manage' ? 'var(--primary)' : 'transparent'
            }}
          >
            Verwalten
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          
          {/* Vorschläge Tab */}
          {selectedTab === 'suggestions' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Liedvorschläge basierend auf aktuellem Fortschritt
                </h3>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Buch: {mockStudentProgress.currentBook} • 
                  Seite: {mockStudentProgress.currentPage} • 
                  Übung: {mockStudentProgress.currentExercise}
                  {mockStudentProgress.techniqueFocus && ` • Fokus: ${mockStudentProgress.techniqueFocus}`}
                </div>
              </div>

              {suggestions.length > 0 ? (
                <div className="space-y-4">
                  {suggestions.map((suggestion, index) => (
                    <div 
                      key={suggestion.song.id}
                      className="rounded-lg p-4 border-l-4"
                      style={{
                        backgroundColor: 'var(--accent-light)',
                        borderLeftColor: getDifficultyColor(suggestion.difficulty)
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                            {suggestion.song.title}
                          </div>
                          <div className="text-base" style={{ color: 'var(--text-secondary)' }}>
                            {suggestion.song.artist}
                          </div>
                        </div>
                        <div 
                          className="px-3 py-1 rounded-lg text-sm font-bold"
                          style={{ 
                            backgroundColor: getDifficultyColor(suggestion.difficulty),
                            color: 'white'
                          }}
                        >
                          {getDifficultyText(suggestion.difficulty)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        <div>Ab Seite {suggestion.song.minPage}</div>
                        <div>Ab Übung {suggestion.song.minExercise}</div>
                        {suggestion.song.tempo && <div>{suggestion.song.tempo} BPM</div>}
                        {suggestion.song.timeSignature && <div>{suggestion.song.timeSignature} Takt</div>}
                      </div>

                      <div className="mb-2">
                        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                          Warum dieser Song:
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {suggestion.matchReason.join(' • ')}
                        </div>
                      </div>

                      {suggestion.song.techniqueFocus.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {suggestion.song.techniqueFocus.map((tech, i) => (
                            <span 
                              key={i}
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{
                                backgroundColor: 'var(--primary)',
                                color: 'white'
                              }}
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}

                      {suggestion.song.notes && (
                        <div className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          💡 {suggestion.song.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  className="text-center py-8 rounded-lg"
                  style={{ 
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--text-muted)'
                  }}
                >
                  Keine passenden Lieder für den aktuellen Fortschritt gefunden.
                </div>
              )}
            </div>
          )}

          {/* Verwalten Tab */}
          {selectedTab === 'manage' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Neues Lied hinzufügen
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Liedtitel"
                    value={newSong.title}
                    onChange={(e) => setNewSong({...newSong, title: e.target.value})}
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Künstler"
                    value={newSong.artist}
                    onChange={(e) => setNewSong({...newSong, artist: e.target.value})}
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <select
                    value={newSong.book}
                    onChange={(e) => setNewSong({...newSong, book: e.target.value})}
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="Essential Beats">Essential Beats</option>
                    <option value="Groove Essentials">Groove Essentials</option>
                    <option value="Rock Beats">Rock Beats</option>
                  </select>
                  
                  <input
                    type="number"
                    placeholder="Min. Seite"
                    value={newSong.minPage}
                    onChange={(e) => setNewSong({...newSong, minPage: parseInt(e.target.value) || 1})}
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  
                  <input
                    type="text"
                    placeholder="Min. Übung (z.B. 10)"
                    value={newSong.minExercise}
                    onChange={(e) => setNewSong({...newSong, minExercise: e.target.value})}
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select
                    value={newSong.difficulty}
                    onChange={(e) => setNewSong({...newSong, difficulty: e.target.value as any})}
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="anfaenger">Anfänger</option>
                    <option value="fortgeschritten">Fortgeschritten</option>
                    <option value="profi">Profi</option>
                  </select>
                  
                  <input
                    type="text"
                    placeholder="Technik-Fokus (kommagetrennt)"
                    value={newSong.techniqueFocus}
                    onChange={(e) => setNewSong({...newSong, techniqueFocus: e.target.value})}
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <textarea
                  placeholder="Notizen (optional)"
                  value={newSong.notes}
                  onChange={(e) => setNewSong({...newSong, notes: e.target.value})}
                  rows={3}
                  className="w-full p-3 rounded-lg border mb-4"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                />

                <button
                  onClick={addSong}
                  className="btn-primary"
                  disabled={!newSong.title || !newSong.artist}
                >
                  Lied hinzufügen
                </button>
              </div>

              {/* Lieder-Liste */}
              <div>
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Alle Lieder ({songs.length})
                </h3>
                
                <div className="space-y-3">
                  {songs.map(song => (
                    <div 
                      key={song.id}
                      className="flex justify-between items-center p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--accent-light)',
                        borderColor: 'var(--border-light)'
                      }}
                    >
                      <div>
                        <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                          {song.title} - {song.artist}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {song.book} • Seite {song.minPage}+ • Übung {song.minExercise}+ • {song.difficulty}
                        </div>
                      </div>
                      <button
                        onClick={() => setSongs(songs.filter(s => s.id !== song.id))}
                        className="text-red-500 hover:text-red-700 px-3 py-1 rounded"
                        title="Lied löschen"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}