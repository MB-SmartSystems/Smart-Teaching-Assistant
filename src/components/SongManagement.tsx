'use client'

import { useState, useEffect } from 'react'
import { Song, convertSongFromBaserow, SongBaserow } from '@/lib/songs'

interface SongManagementProps {
  isOpen: boolean
  onClose: () => void
}

const BOOKS = ['Essential Beats', 'Groove Essentials', 'Rock Beats']
const DIFFICULTIES: Song['schwierigkeit'][] = ['Anfänger', 'Fortgeschritten', 'Profi']

const emptyForm = {
  titel: '',
  interpret: '',
  schwierigkeit: 'Anfänger' as Song['schwierigkeit'],
  buch: 'Essential Beats',
  mindest_seite: 1,
  mindest_uebung: 1,
  reihenfolge: 0,
}

export default function SongManagement({ isOpen, onClose }: SongManagementProps) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ ...emptyForm })

  useEffect(() => {
    if (isOpen) loadSongs()
  }, [isOpen])

  const loadSongs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/songs')
      if (!res.ok) throw new Error('Fehler beim Laden')
      const data = await res.json()
      setSongs(data.map((s: SongBaserow) => convertSongFromBaserow(s)))
    } catch (e) {
      setError('Songs konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  const addSong = async () => {
    if (!form.titel || !form.interpret || !form.buch) return
    setSaving(true)
    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titel: form.titel,
          interpret: form.interpret,
          schwierigkeit: form.schwierigkeit,
          buch: form.buch,
          mindest_seite: form.mindest_seite,
          mindest_uebung: form.mindest_uebung,
          reihenfolge: form.reihenfolge,
        })
      })
      if (!res.ok) throw new Error('Fehler')
      const created: SongBaserow = await res.json()
      setSongs(prev => [...prev, convertSongFromBaserow(created)])
      setForm({ ...emptyForm })
    } catch {
      setError('Song konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (song: Song) => {
    setEditingId(song.id)
    setEditForm({
      titel: song.titel,
      interpret: song.interpret,
      schwierigkeit: song.schwierigkeit,
      buch: song.buch,
      mindest_seite: song.mindest_seite,
      mindest_uebung: song.mindest_uebung,
      reihenfolge: song.reihenfolge,
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const res = await fetch('/api/songs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...editForm })
      })
      if (!res.ok) throw new Error('Fehler')
      const updated: SongBaserow = await res.json()
      setSongs(prev => prev.map(s => s.id === editingId ? convertSongFromBaserow(updated) : s))
      setEditingId(null)
    } catch {
      setError('Song konnte nicht aktualisiert werden.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-primary)',
    borderColor: 'var(--border-medium)',
    color: 'var(--text-primary)',
  }

  if (!isOpen) return null

  const grouped = DIFFICULTIES.reduce((acc, diff) => {
    acc[diff] = songs.filter(s => s.schwierigkeit === diff)
    return acc
  }, {} as Record<string, Song[]>)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Lieder-Datenbank</h2>
          <button onClick={onClose} className="btn-secondary">Schließen</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {error && (
            <div className="p-3 rounded text-sm" style={{ backgroundColor: 'var(--status-error)', color: 'white' }}>{error}</div>
          )}

          {/* Neues Lied */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Neues Lied hinzufügen</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="text" placeholder="Titel" value={form.titel} onChange={e => setForm({...form, titel: e.target.value})} className="p-2 rounded border text-sm" style={inputStyle} />
              <input type="text" placeholder="Interpret" value={form.interpret} onChange={e => setForm({...form, interpret: e.target.value})} className="p-2 rounded border text-sm" style={inputStyle} />
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <select value={form.schwierigkeit} onChange={e => setForm({...form, schwierigkeit: e.target.value as Song['schwierigkeit']})} className="p-2 rounded border text-sm" style={inputStyle}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={form.buch} onChange={e => setForm({...form, buch: e.target.value})} className="p-2 rounded border text-sm" style={inputStyle}>
                {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <input type="number" placeholder="Reihenfolge" value={form.reihenfolge} onChange={e => setForm({...form, reihenfolge: parseInt(e.target.value)||0})} className="p-2 rounded border text-sm" style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="number" placeholder="Min. Seite" value={form.mindest_seite} onChange={e => setForm({...form, mindest_seite: parseInt(e.target.value)||1})} className="p-2 rounded border text-sm" style={inputStyle} />
              <input type="number" placeholder="Min. Übung" value={form.mindest_uebung} onChange={e => setForm({...form, mindest_uebung: parseInt(e.target.value)||1})} className="p-2 rounded border text-sm" style={inputStyle} />
            </div>
            <button onClick={addSong} disabled={!form.titel || !form.interpret || saving} className="btn-primary text-sm" style={{ opacity: (!form.titel || !form.interpret || saving) ? 0.5 : 1 }}>
              {saving ? 'Speichern...' : 'Lied hinzufügen'}
            </button>
          </div>

          {/* Liste */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Alle Lieder ({songs.length})
              {loading && <span className="text-sm font-normal ml-2" style={{ color: 'var(--text-muted)' }}>Laden...</span>}
            </h3>
            {DIFFICULTIES.map(diff => grouped[diff].length > 0 && (
              <div key={diff} className="mb-4">
                <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>{diff}</div>
                <div className="space-y-2">
                  {grouped[diff].map(song => (
                    <div key={song.id}>
                      {editingId === song.id ? (
                        <div className="p-3 rounded border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--primary)' }}>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input type="text" value={editForm.titel} onChange={e => setEditForm({...editForm, titel: e.target.value})} className="p-2 rounded border text-sm" style={inputStyle} />
                            <input type="text" value={editForm.interpret} onChange={e => setEditForm({...editForm, interpret: e.target.value})} className="p-2 rounded border text-sm" style={inputStyle} />
                          </div>
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            <select value={editForm.schwierigkeit} onChange={e => setEditForm({...editForm, schwierigkeit: e.target.value as Song['schwierigkeit']})} className="p-2 rounded border text-sm" style={inputStyle}>
                              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select value={editForm.buch} onChange={e => setEditForm({...editForm, buch: e.target.value})} className="p-2 rounded border text-sm" style={inputStyle}>
                              {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <input type="number" value={editForm.mindest_seite} onChange={e => setEditForm({...editForm, mindest_seite: parseInt(e.target.value)||1})} className="p-2 rounded border text-sm" style={inputStyle} placeholder="Seite" />
                            <input type="number" value={editForm.mindest_uebung} onChange={e => setEditForm({...editForm, mindest_uebung: parseInt(e.target.value)||1})} className="p-2 rounded border text-sm" style={inputStyle} placeholder="Übung" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveEdit} disabled={saving} className="btn-primary text-sm">Speichern</button>
                            <button onClick={() => setEditingId(null)} className="btn-secondary text-sm">Abbrechen</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center p-3 rounded border" style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--border-light)' }}>
                          <div>
                            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{song.titel}</span>
                            <span className="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>{song.interpret}</span>
                            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{song.buch} · S.{song.mindest_seite} · Ü.{song.mindest_uebung}</span>
                          </div>
                          <button onClick={() => startEdit(song)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}>&#9998;</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!loading && songs.length === 0 && (
              <div className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Noch keine Lieder. Füge das erste Lied hinzu.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
