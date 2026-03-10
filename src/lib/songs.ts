// Song-Datenbank für Smart Teaching Assistant
// Songs kommen aus Baserow Tabelle 899

// Baserow-Rohdaten (Table 899)
export interface SongBaserow {
  id: number
  field_8795: string   // Titel
  field_8796: string   // Interpret
  field_8797: { id: number; value: string; color: string } | null // Schwierigkeit
  field_8798: string   // Buch
  field_8799: number   // Mindest_Seite
  field_8800: number   // Mindest_Übung
  field_8801: number   // Reihenfolge
}

// App-Format
export interface Song {
  id: number
  titel: string
  interpret: string
  schwierigkeit: 'Anfänger' | 'Fortgeschritten' | 'Profi'
  buch: string
  mindest_seite: number
  mindest_uebung: number
  reihenfolge: number
}

// song_status Format (gespeichert als JSON-String in Baserow field_8802)
export interface SongStatus {
  aktiviert: Array<{ id: number; am: string }>
}

export function parseSongStatus(raw: string | null | undefined): SongStatus {
  if (!raw) return { aktiviert: [] }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.aktiviert)) return parsed
  } catch {}
  return { aktiviert: [] }
}

export function convertSongFromBaserow(raw: SongBaserow): Song {
  return {
    id: raw.id,
    titel: raw.field_8795 || '',
    interpret: raw.field_8796 || '',
    schwierigkeit: (raw.field_8797?.value as Song['schwierigkeit']) || 'Anfänger',
    buch: raw.field_8798 || '',
    mindest_seite: raw.field_8799 || 1,
    mindest_uebung: raw.field_8800 || 1,
    reihenfolge: raw.field_8801 || 0,
  }
}

// Schüler-Fortschritt für einen Buch-Slot
export interface BuchProgress {
  buch: string
  seite: number
  uebung: number
}

// Gibt qualifizierende Songs für einen Schüler zurück (noch nicht aktiviert)
export function getSongVorschlaege(
  songs: Song[],
  buchProgress: BuchProgress[],   // [buch1, buch2] jeweils mit seite+uebung
  songStatus: SongStatus
): Song[] {
  const aktiviertIds = new Set(songStatus.aktiviert.map(a => a.id))

  return songs.filter(song => {
    if (aktiviertIds.has(song.id)) return false
    // Passt der Song zu einem der Bücher des Schülers?
    return buchProgress.some(progress =>
      progress.buch &&
      song.buch === progress.buch &&
      progress.seite >= song.mindest_seite &&
      progress.uebung >= song.mindest_uebung
    )
  })
}

// Hilfsfunktion: Seite/Übung aus String parsen
export function parseUebungToNumber(s: string): number {
  if (!s) return 1
  const m = s.match(/(\d+)/)
  return m ? parseInt(m[1]) : 1
}
