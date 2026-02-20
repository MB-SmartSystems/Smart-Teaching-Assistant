// Auto-Switch Logik für Smart Teaching Assistant

import { SchülerApp } from './baserow'

export interface AutoSwitchResult {
  currentStudent: SchülerApp | null
  nextStudent: SchülerApp | null
  minutesUntilNext: number
  isWaitingTime: boolean
}

// Haupt Auto-Switch Funktion
export function getAutoSwitchStatus(students: SchülerApp[], minutesEarly: number = 5): AutoSwitchResult {
  const now = new Date()
  const currentDay = getCurrentGermanDay(now)
  // Berücksichtige auch Sekunden für präziseres Timing
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60)
  
  // Filter Schüler für heute
  const todaysStudents = students
    .filter(s => s.unterrichtstag.toLowerCase() === currentDay.toLowerCase())
    .filter(s => s.unterrichtszeit) // Nur Schüler mit gesetzten Zeiten
    .map(student => {
      const timeRange = parseTimeRange(student.unterrichtszeit)
      return {
        ...student,
        startTime: timeRange.start,
        endTime: timeRange.end,
        switchTime: timeRange.start - minutesEarly
      }
    })
    .filter(s => s.startTime !== -1) // Nur gültige Zeiten
    .sort((a, b) => a.startTime - b.startTime) // Nach Startzeit sortieren

  // Aktuellen Schüler finden (5 Min vor bis Endzeit - oder 45 Min nach Beginn falls keine Endzeit)
  const currentStudent = todaysStudents.find(student => 
    currentTimeMinutes >= student.switchTime && 
    currentTimeMinutes <= (student.endTime !== -1 ? student.endTime : student.startTime + 45)
  ) || null

  // Nächsten Schüler finden
  const upcomingStudents = todaysStudents.filter(student => 
    student.switchTime > currentTimeMinutes
  )
  const nextStudent = upcomingStudents[0] || null
  
  // Minuten bis zum nächsten Schüler
  const minutesUntilNext = nextStudent 
    ? nextStudent.switchTime - currentTimeMinutes
    : -1

  // Wartezeit-Check
  const isWaitingTime = !currentStudent && nextStudent && minutesUntilNext > 0

  return {
    currentStudent,
    nextStudent, 
    minutesUntilNext,
    isWaitingTime
  }
}

// Helper: "11:00-16:00" → { start: 660, end: 960 }
function parseTimeRange(timeString: string): { start: number; end: number } {
  if (!timeString) return { start: -1, end: -1 }
  
  // Check für Range-Format "HH:MM-HH:MM"
  const rangeMatch = timeString.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/)
  if (rangeMatch) {
    const startHours = parseInt(rangeMatch[1])
    const startMinutes = parseInt(rangeMatch[2])
    const endHours = parseInt(rangeMatch[3])
    const endMinutes = parseInt(rangeMatch[4])
    
    // Validierung
    if (startHours < 0 || startHours > 23 || startMinutes < 0 || startMinutes > 59) return { start: -1, end: -1 }
    if (endHours < 0 || endHours > 23 || endMinutes < 0 || endMinutes > 59) return { start: -1, end: -1 }
    
    const start = startHours * 60 + startMinutes
    const end = endHours * 60 + endMinutes
    
    return { start, end }
  }
  
  // Fallback: Nur Startzeit "HH:MM"
  const singleMatch = timeString.match(/(\d{1,2}):(\d{2})/)
  if (singleMatch) {
    const hours = parseInt(singleMatch[1])
    const minutes = parseInt(singleMatch[2])
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return { start: -1, end: -1 }
    
    const time = hours * 60 + minutes
    return { start: time, end: -1 } // Keine Endzeit
  }
  
  return { start: -1, end: -1 }
}

// Helper: Legacy-Support für parseTimeToMinutes (für Kompatibilität)
function parseTimeToMinutes(timeString: string): number {
  const range = parseTimeRange(timeString)
  return range.start
}

// Helper: Aktuellen deutschen Wochentag ermitteln
function getCurrentGermanDay(date: Date = new Date()): string {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
  return days[date.getDay()]
}

// Helper: Minuten zu "HH:MM" formatieren
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// Helper: Countdown-Text generieren
export function getCountdownText(minutes: number): string {
  const rounded = Math.round(minutes)
  if (rounded < 0) return ''
  if (rounded === 0) return 'Jetzt!'
  if (rounded === 1) return 'In 1 Minute'
  if (rounded < 60) return `In ${rounded} Min`

  const hours = Math.floor(rounded / 60)
  const remainingMins = rounded % 60

  if (remainingMins === 0) return `In ${hours}h`
  return `In ${hours}h ${remainingMins}min`
}

// Debug Helper: Aktueller Status
export function getDebugInfo(students: SchülerApp[], minutesEarly: number = 5): {
  currentTime: string
  currentTimeMinutes: number
  currentDay: string
  todaysStudents: Array<{ name: string; time: string; startTime: number; switchTime: number }>
} {
  const now = new Date()
  const currentDay = getCurrentGermanDay(now)
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60)
  
  const todaysStudents = students
    .filter(s => s.unterrichtstag.toLowerCase() === currentDay.toLowerCase())
    .filter(s => s.unterrichtszeit)
    .map(student => ({
      name: `${student.vorname} ${student.nachname}`,
      time: student.unterrichtszeit,
      startTime: parseTimeToMinutes(student.unterrichtszeit),
      switchTime: parseTimeToMinutes(student.unterrichtszeit) - minutesEarly
    }))
    .filter(s => s.startTime !== -1)
    .sort((a, b) => a.startTime - b.startTime)
  
  return {
    currentTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
    currentTimeMinutes,
    currentDay,
    todaysStudents
  }
}

// Debug Helper: Alle heutigen Termine anzeigen
export function getTodaysSchedule(students: SchülerApp[]): Array<{
  name: string
  time: string
  timeMinutes: number
  switchTime: number
}> {
  const now = new Date()
  const currentDay = getCurrentGermanDay(now)
  
  return students
    .filter(s => s.unterrichtstag.toLowerCase() === currentDay.toLowerCase())
    .filter(s => s.unterrichtszeit)
    .map(student => ({
      name: `${student.vorname} ${student.nachname}`,
      time: student.unterrichtszeit,
      timeMinutes: parseTimeToMinutes(student.unterrichtszeit),
      switchTime: parseTimeToMinutes(student.unterrichtszeit) - 5
    }))
    .filter(s => s.timeMinutes !== -1)
    .sort((a, b) => a.timeMinutes - b.timeMinutes)
}