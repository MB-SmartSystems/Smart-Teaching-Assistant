// Lieder-Datenbank für Smart Teaching Assistant
// Verwaltet Liedvorschläge basierend auf Übungsfortschritt

// Song-Datentyp für Baserow
export interface SongBaserow {
  id: number
  field_song_title: string        // Liedtitel
  field_artist: string            // Künstler/Band
  field_album?: string            // Album (optional)
  field_book: string              // Zugehöriges Buch
  field_min_page: number          // Mindest-Seitenzahl
  field_min_exercise: string      // Mindest-Übung (z.B. "10" oder "15-20")
  field_max_exercise?: string     // Max-Übung (optional, für Übungsbereiche)
  field_difficulty: { id: number; value: string; color: string } | null // Anfänger/Fortgeschritten/Profi
  field_technique_focus: string   // Technik-Fokus (z.B. "Fills, Handhaltung")
  field_tempo?: number           // BPM (optional)
  field_time_signature?: string   // Taktart (4/4, 3/4, etc.)
  field_notes?: string           // Besondere Hinweise
  field_youtube_link?: string    // YouTube-Link (optional)
  field_spotify_link?: string    // Spotify-Link (optional)
  field_active: boolean          // Aktiv/Inaktiv
}

// Vereinfachte Song-Struktur für die App
export interface Song {
  id: number
  title: string
  artist: string
  album?: string
  book: string
  minPage: number
  minExercise: string
  maxExercise?: string
  difficulty: 'anfaenger' | 'fortgeschritten' | 'profi'
  techniqueFocus: string[]        // Array aus einzelnen Techniken
  tempo?: number
  timeSignature?: string
  notes?: string
  youtubeLink?: string
  spotifyLink?: string
  active: boolean
}

// Schüler-Fortschritt für Liedvorschläge
export interface StudentProgress {
  currentBook: string
  currentPage: number
  currentExercise: string       // z.B. "15" oder "10-15"
  techniqueFocus?: string       // Aktueller Fokus-Bereich
}

// Liedvorschlag-Ergebnis
export interface SongSuggestion {
  song: Song
  matchReason: string[]         // Warum dieser Song vorgeschlagen wird
  difficulty: 'perfect' | 'easy' | 'challenging'
}

// Helper: Übung zu Nummer konvertieren (für Vergleiche)
export function parseExerciseToNumber(exerciseString: string): { min: number; max: number } {
  if (!exerciseString) return { min: 1, max: 1 }
  
  const dashMatch = exerciseString.match(/(\d+)-(\d+)/)
  if (dashMatch) {
    return { min: parseInt(dashMatch[1]), max: parseInt(dashMatch[2]) }
  }
  
  const singleMatch = exerciseString.match(/(\d+)/)
  if (singleMatch) {
    const num = parseInt(singleMatch[1])
    return { min: num, max: num }
  }
  
  return { min: 1, max: 1 }
}

// Helper: Prüfen ob Schüler Übung erreicht hat
export function hasReachedExercise(studentExercise: string, requiredExercise: string): boolean {
  const student = parseExerciseToNumber(studentExercise)
  const required = parseExerciseToNumber(requiredExercise)
  
  // Schüler muss mindestens die erforderliche Übung erreicht haben
  return student.max >= required.min
}

// Helper: Schwierigkeitsgrad bewerten
export function assessDifficulty(
  studentProgress: StudentProgress, 
  song: Song
): 'perfect' | 'easy' | 'challenging' {
  const studentEx = parseExerciseToNumber(studentProgress.currentExercise)
  const songMinEx = parseExerciseToNumber(song.minExercise)
  const songMaxEx = song.maxExercise ? parseExerciseToNumber(song.maxExercise) : songMinEx
  
  // Unterschied zwischen aktuellem Stand und Song-Anforderung
  const diffToMin = studentEx.max - songMinEx.min
  const diffToMax = studentEx.max - songMaxEx.max
  
  if (diffToMin >= 10) return 'easy'        // 10+ Übungen darüber
  if (diffToMax >= -5 && diffToMax <= 5) return 'perfect'  // Genau richtig
  return 'challenging'                       // Noch zu schwer
}

// Liedvorschläge generieren
export function generateSongSuggestions(
  studentProgress: StudentProgress,
  availableSongs: Song[]
): SongSuggestion[] {
  const suggestions: SongSuggestion[] = []
  
  for (const song of availableSongs) {
    if (!song.active) continue
    
    // Buch muss übereinstimmen
    if (song.book !== studentProgress.currentBook) continue
    
    // Mindest-Seite erreicht?
    if (studentProgress.currentPage < song.minPage) continue
    
    // Mindest-Übung erreicht?
    if (!hasReachedExercise(studentProgress.currentExercise, song.minExercise)) continue
    
    // Grund für Vorschlag sammeln
    const matchReason: string[] = []
    const difficulty = assessDifficulty(studentProgress, song)
    
    matchReason.push(`Seite ${song.minPage}+ erreicht`)
    matchReason.push(`Übung ${song.minExercise}+ erreicht`)
    
    // Technik-Fokus-Match?
    if (studentProgress.techniqueFocus && song.techniqueFocus.some(tech => 
      studentProgress.techniqueFocus!.toLowerCase().includes(tech.toLowerCase())
    )) {
      matchReason.push(`Passt zu Fokus: ${studentProgress.techniqueFocus}`)
    }
    
    suggestions.push({
      song,
      matchReason,
      difficulty
    })
  }
  
  // Sortieren: Perfect > Easy > Challenging, dann nach Seite
  return suggestions.sort((a, b) => {
    const difficultyOrder = { 'perfect': 3, 'easy': 2, 'challenging': 1 }
    const diffSort = difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty]
    if (diffSort !== 0) return diffSort
    
    return a.song.minPage - b.song.minPage
  })
}

// Helper: Baserow-Daten zu App-Format konvertieren
export function convertSongToAppFormat(baserowSong: SongBaserow): Song {
  return {
    id: baserowSong.id,
    title: baserowSong.field_song_title || '',
    artist: baserowSong.field_artist || '',
    album: baserowSong.field_album || undefined,
    book: baserowSong.field_book || '',
    minPage: baserowSong.field_min_page || 1,
    minExercise: baserowSong.field_min_exercise || '1',
    maxExercise: baserowSong.field_max_exercise || undefined,
    difficulty: (baserowSong.field_difficulty?.value?.toLowerCase() as any) || 'anfaenger',
    techniqueFocus: baserowSong.field_technique_focus 
      ? baserowSong.field_technique_focus.split(',').map(t => t.trim())
      : [],
    tempo: baserowSong.field_tempo || undefined,
    timeSignature: baserowSong.field_time_signature || undefined,
    notes: baserowSong.field_notes || undefined,
    youtubeLink: baserowSong.field_youtube_link || undefined,
    spotifyLink: baserowSong.field_spotify_link || undefined,
    active: baserowSong.field_active !== false
  }
}

// Mock-Daten für Testing (bis Baserow-Tabelle erstellt ist)
export const mockSongs: Song[] = [
  {
    id: 1,
    title: "We Will Rock You",
    artist: "Queen",
    book: "Essential Beats",
    minPage: 25,
    minExercise: "8",
    difficulty: "anfaenger",
    techniqueFocus: ["Grundrhythmus", "Timing"],
    tempo: 114,
    timeSignature: "4/4",
    notes: "Perfekt für Anfänger - einfacher 4/4 Beat",
    active: true
  },
  {
    id: 2,
    title: "Back in Black",
    artist: "AC/DC", 
    book: "Essential Beats",
    minPage: 35,
    minExercise: "12",
    difficulty: "anfaenger",
    techniqueFocus: ["Hi-Hat", "Snare-Akzente"],
    tempo: 93,
    timeSignature: "4/4",
    notes: "Klassischer Rock-Beat mit Hi-Hat-Variationen",
    active: true
  },
  {
    id: 3,
    title: "Billie Jean",
    artist: "Michael Jackson",
    book: "Essential Beats", 
    minPage: 45,
    minExercise: "18",
    difficulty: "fortgeschritten",
    techniqueFocus: ["Fills", "Tom-Kombinationen"],
    tempo: 117,
    timeSignature: "4/4",
    notes: "Erfordert präzise Fills zwischen den Takten",
    active: true
  }
]