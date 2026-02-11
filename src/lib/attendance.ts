// Anwesenheits-Tracking für Schüler
// Speichert wann Schüler da waren, krank waren oder abgesagt haben

export type AttendanceStatus = 'erschienen' | 'krank' | 'abgesagt' | 'nicht_erschienen'

export interface AttendanceRecord {
  studentId: number
  date: string // YYYY-MM-DD Format
  status: AttendanceStatus
  timestamp: number // wann der Status gesetzt wurde
  note?: string // optional Notiz
}

const ATTENDANCE_KEY = 'teaching_assistant_attendance'

// Alle Anwesenheitsdaten laden
export function getAllAttendance(): AttendanceRecord[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(ATTENDANCE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.warn('Fehler beim Laden der Anwesenheitsdaten:', error)
    return []
  }
}

// Anwesenheit für einen Schüler an einem bestimmten Tag setzen
export function setAttendance(
  studentId: number, 
  date: string, 
  status: AttendanceStatus, 
  note?: string
): void {
  if (typeof window === 'undefined') return
  
  const allRecords = getAllAttendance()
  
  // Bestehenden Eintrag finden und aktualisieren oder neuen erstellen
  const existingIndex = allRecords.findIndex(
    record => record.studentId === studentId && record.date === date
  )
  
  const newRecord: AttendanceRecord = {
    studentId,
    date,
    status,
    timestamp: Date.now(),
    note
  }
  
  if (existingIndex !== -1) {
    allRecords[existingIndex] = newRecord
  } else {
    allRecords.push(newRecord)
  }
  
  // Speichern
  try {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(allRecords))
  } catch (error) {
    console.error('Fehler beim Speichern der Anwesenheitsdaten:', error)
  }
}

// Anwesenheitsstatus für einen Schüler an einem bestimmten Tag abrufen
export function getAttendanceForDate(studentId: number, date: string): AttendanceRecord | null {
  const allRecords = getAllAttendance()
  return allRecords.find(
    record => record.studentId === studentId && record.date === date
  ) || null
}

// Anwesenheitsstatus für einen Schüler heute abrufen
export function getTodayAttendance(studentId: number): AttendanceRecord | null {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return getAttendanceForDate(studentId, today)
}

// Alle Anwesenheitsdaten für einen Schüler (für Statistiken)
export function getAttendanceHistory(studentId: number, limit?: number): AttendanceRecord[] {
  const allRecords = getAllAttendance()
  const studentRecords = allRecords
    .filter(record => record.studentId === studentId)
    .sort((a, b) => b.timestamp - a.timestamp) // neueste zuerst
  
  return limit ? studentRecords.slice(0, limit) : studentRecords
}

// Anwesenheits-Statistiken für einen Schüler
export function getAttendanceStats(studentId: number, lastNDays?: number): {
  total: number
  appeared: number
  sick: number
  cancelled: number
  noShow: number
  rate: number
} {
  let records = getAttendanceHistory(studentId)
  
  // Optional: nur letzte N Tage
  if (lastNDays) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lastNDays)
    const cutoffString = cutoffDate.toISOString().split('T')[0]
    
    records = records.filter(record => record.date >= cutoffString)
  }
  
  const total = records.length
  const appeared = records.filter(r => r.status === 'erschienen').length
  const sick = records.filter(r => r.status === 'krank').length
  const cancelled = records.filter(r => r.status === 'abgesagt').length
  const noShow = records.filter(r => r.status === 'nicht_erschienen').length
  const rate = total > 0 ? (appeared / total) * 100 : 0
  
  return { total, appeared, sick, cancelled, noShow, rate: Math.round(rate) }
}

// Anwesenheitseintrag löschen (falls versehentlich gesetzt)
export function removeAttendance(studentId: number, date: string): void {
  if (typeof window === 'undefined') return
  
  const allRecords = getAllAttendance()
  const filtered = allRecords.filter(
    record => !(record.studentId === studentId && record.date === date)
  )
  
  try {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Fehler beim Löschen der Anwesenheitsdaten:', error)
  }
}

// Heute als String (YYYY-MM-DD)
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

// Datum formatieren für Anzeige
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    return dateString
  }
}

// Status-Text für Anzeige
export function getStatusText(status: AttendanceStatus): string {
  const statusMap: { [key in AttendanceStatus]: string } = {
    'erschienen': 'Erschienen',
    'krank': 'Krank',
    'abgesagt': 'Abgesagt',
    'nicht_erschienen': 'Nicht erschienen'
  }
  return statusMap[status]
}

// Status-Farbe für UI
export function getStatusColor(status: AttendanceStatus): string {
  const colorMap: { [key in AttendanceStatus]: string } = {
    'erschienen': 'var(--status-success)',
    'krank': 'var(--status-warning)',
    'abgesagt': 'var(--status-neutral)',
    'nicht_erschienen': 'var(--status-error)'
  }
  return colorMap[status]
}