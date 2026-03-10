'use client'

import { useState, useEffect } from 'react'
import { Song, SongStatus, parseSongStatus, getSongVorschlaege, convertSongFromBaserow, SongBaserow, parseUebungToNumber } from '@/lib/songs'
import { SchülerApp } from '@/lib/baserow'

interface SongSuggestionsProps {
  student: SchülerApp
  onSongAccepted?: (newSongStatus: string) => void
  onEditSong?: (song: Song) => void
}

export default function SongSuggestions({ student, onSongAccepted, onEditSong }: SongSuggestionsProps) {
  const [songs, setSongs] = useState<Song[]>([])
  const [accepting, setAccepting] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/songs')
      .then(r => r.json())
      .then(data => setSongs(data.map((s: SongBaserow) => convertSongFromBaserow(s))))
      .catch(() => {})
  }, [])

  const songStatus = parseSongStatus(student.songStatus)

  const buchProgress = [
    { buch: student.buch || '', seite: parseInt(student.seite || '1'), uebung: parseUebungToNumber(student.übung) },
    ...(student.buch2 ? [{ buch: student.buch2, seite: parseInt(student.seite2 || '1'), uebung: parseUebungToNumber(student.übung2) }] : [])
  ]

  const vorschlaege = getSongVorschlaege(songs, buchProgress, songStatus)

  const akzeptieren = async (song: Song) => {
    setAccepting(song.id)
    const today = new Date().toISOString().split('T')[0]
    const newStatus: SongStatus = {
      aktiviert: [...songStatus.aktiviert, { id: song.id, am: today }]
    }
    const newStatusStr = JSON.stringify(newStatus)
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id, fieldName: 'field_8802', value: newStatusStr })
      })
      if (res.ok && onSongAccepted) {
        onSongAccepted(newStatusStr)
      }
    } catch {}
    setAccepting(null)
  }

  if (vorschlaege.length === 0) return null

  return (
    <div className="mt-3">
      <div className="text-xs font-semibold mb-2 uppercase" style={{ color: 'var(--text-muted)' }}>Lied-Vorschläge</div>
      <div className="space-y-2">
        {vorschlaege.map(song => (
          <div key={song.id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: 'var(--accent-light)' }}>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{song.titel}</span>
              <span className="text-sm ml-2 italic" style={{ color: 'var(--text-muted)' }}>{song.interpret}</span>
            </div>
            <div className="flex gap-2 ml-2 flex-shrink-0">
              <button
                onClick={() => akzeptieren(song)}
                disabled={accepting === song.id}
                className="text-xs px-3 py-1 rounded border"
                style={{
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-medium)',
                  backgroundColor: 'var(--bg-secondary)',
                  opacity: accepting === song.id ? 0.5 : 1
                }}
              >
                {accepting === song.id ? '...' : 'Akzeptieren'}
              </button>
              {onEditSong && (
                <button
                  onClick={() => onEditSong(song)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
                  title="Bearbeiten"
                >
                  &#9998;
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
