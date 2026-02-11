// Einnahmen-Berechnung für Schüler
// Berechnet Gesamteinnahmen basierend auf Unterrichtsdauer und Zahlungen

import { SchülerApp } from './baserow'
import { getAttendanceHistory } from './attendance'

export interface EarningsData {
  studentId: number
  monthlyRate: number
  startDate: string // YYYY-MM-DD
  totalMonths: number
  totalEarnings: number
  paidAmount: number
  outstandingAmount: number
  attendanceRate: number
  projectedMonthlyEarnings: number
}

const STUDENT_START_DATES_KEY = 'teaching_assistant_student_start_dates'

// Startdaten für Schüler speichern/laden
export function getStudentStartDates(): { [studentId: number]: string } {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(STUDENT_START_DATES_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.warn('Fehler beim Laden der Schüler-Startdaten:', error)
    return {}
  }
}

export function setStudentStartDate(studentId: number, startDate: string): void {
  if (typeof window === 'undefined') return
  
  const startDates = getStudentStartDates()
  startDates[studentId] = startDate
  
  try {
    localStorage.setItem(STUDENT_START_DATES_KEY, JSON.stringify(startDates))
  } catch (error) {
    console.error('Fehler beim Speichern der Schüler-Startdaten:', error)
  }
}

export function getStudentStartDate(studentId: number): string | null {
  const startDates = getStudentStartDates()
  return startDates[studentId] || null
}

// Anzahl Monate zwischen zwei Daten berechnen
function getMonthsBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                (end.getMonth() - start.getMonth())
  
  // Partial month berücksichtigen
  const dayDiff = end.getDate() - start.getDate()
  if (dayDiff < 0) {
    return Math.max(0, months - 1 + (dayDiff + 30) / 30)
  } else {
    return Math.max(0, months + dayDiff / 30)
  }
}

// Einnahmen für einen Schüler berechnen
export function calculateEarnings(student: SchülerApp): EarningsData | null {
  const monthlyRate = parseFloat(student.monatlicherbetrag) || 0
  if (monthlyRate <= 0) return null
  
  const startDate = getStudentStartDate(student.id)
  if (!startDate) return null
  
  const today = new Date().toISOString().split('T')[0]
  const totalMonths = getMonthsBetween(startDate, today)
  
  // Anwesenheitsrate der letzten 30 Tage
  const attendanceHistory = getAttendanceHistory(student.id, 30)
  const totalLessons = attendanceHistory.length
  const attendedLessons = attendanceHistory.filter(record => 
    record.status === 'erschienen'
  ).length
  const attendanceRate = totalLessons > 0 ? (attendedLessons / totalLessons) * 100 : 100
  
  // Grobe Einnahmen-Schätzung
  const totalEarnings = monthlyRate * totalMonths
  
  // Bezahlten Betrag basierend auf Zahlungsstatus schätzen
  let paidAmount = 0
  if (student.zahlungStatus === 'ja') {
    paidAmount = totalEarnings
  } else if (student.zahlungStatus === 'nein') {
    paidAmount = totalEarnings * 0.5 // Annahme: 50% bezahlt
  } else {
    paidAmount = totalEarnings * 0.8 // Annahme: 80% bezahlt
  }
  
  const outstandingAmount = Math.max(0, totalEarnings - paidAmount)
  const projectedMonthlyEarnings = monthlyRate * (attendanceRate / 100)
  
  return {
    studentId: student.id,
    monthlyRate,
    startDate,
    totalMonths: Math.round(totalMonths * 10) / 10, // 1 Dezimalstelle
    totalEarnings: Math.round(totalEarnings),
    paidAmount: Math.round(paidAmount),
    outstandingAmount: Math.round(outstandingAmount),
    attendanceRate: Math.round(attendanceRate),
    projectedMonthlyEarnings: Math.round(projectedMonthlyEarnings)
  }
}

// Gesamteinnahmen aller Schüler berechnen
export function calculateTotalEarnings(students: SchülerApp[]): {
  totalStudents: number
  totalMonthlyRevenue: number
  totalLifetimeRevenue: number
  totalOutstanding: number
  averageMonthlyRate: number
  activeStudents: number
} {
  let totalMonthlyRevenue = 0
  let totalLifetimeRevenue = 0
  let totalOutstanding = 0
  let activeStudents = 0
  
  for (const student of students) {
    const monthlyRate = parseFloat(student.monatlicherbetrag) || 0
    if (monthlyRate > 0) {
      activeStudents++
      totalMonthlyRevenue += monthlyRate
      
      const earnings = calculateEarnings(student)
      if (earnings) {
        totalLifetimeRevenue += earnings.totalEarnings
        totalOutstanding += earnings.outstandingAmount
      }
    }
  }
  
  return {
    totalStudents: students.length,
    activeStudents,
    totalMonthlyRevenue: Math.round(totalMonthlyRevenue),
    totalLifetimeRevenue: Math.round(totalLifetimeRevenue),
    totalOutstanding: Math.round(totalOutstanding),
    averageMonthlyRate: activeStudents > 0 ? Math.round(totalMonthlyRevenue / activeStudents) : 0
  }
}

// Format-Helper für Währung
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Format-Helper für Monate
export function formatMonths(months: number): string {
  if (months < 1) {
    const weeks = Math.round(months * 4)
    return `${weeks} Woche${weeks !== 1 ? 'n' : ''}`
  }
  
  const fullMonths = Math.floor(months)
  const remainderWeeks = Math.round((months - fullMonths) * 4)
  
  if (remainderWeeks === 0) {
    return `${fullMonths} Monat${fullMonths !== 1 ? 'e' : ''}`
  }
  
  return `${fullMonths} Monat${fullMonths !== 1 ? 'e' : ''}, ${remainderWeeks} Woche${remainderWeeks !== 1 ? 'n' : ''}`
}

// Standardstartdatum setzen (für neue Schüler ohne Startdatum)
export function setDefaultStartDate(studentId: number): void {
  const existing = getStudentStartDate(studentId)
  if (!existing) {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const defaultDate = threeMonthsAgo.toISOString().split('T')[0]
    setStudentStartDate(studentId, defaultDate)
  }
}