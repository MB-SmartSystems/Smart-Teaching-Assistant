// Baserow API Integration für Smart Teaching Assistant
// Alle Calls laufen über Server-Side API Routes (/api/students)

// Schüler-Datentyp basierend auf COPY-Baserow-Feldern (Tabelle 853)
export interface Schüler {
  id: number
  order: string
  field_8176: string // Vorname
  field_8177: string // Nachname  
  field_8178: string // Geburtsdatum
  field_8269: string // Alter
  field_8188: { id: number; value: string; color: string } | null // Unterrichtstag
  field_8189: string // Unterrichtszeit
  field_8190: string // Buch
  field_8191: string // Seite
  field_8192: string // Übung
  field_8193: string // Aktuelle_Lieder
  field_8194: string // Größter_Bedarf (→ Wichtiger Fokus)
  field_8195: string // Monatlicher_Betrag
  field_8200: { id: number; value: string; color: string } | null // Anfrage_Status
  field_8211: { id: number; value: string; color: string } | null // Zahlung läuft?
  field_8185: string // Ansprechpartner_Name
  field_8186: string // Handynummer_Ansprechpartner
  field_8187: string // Email_Ansprechpartner
  field_8212: string // Startdatum_Unterrichtsvertrag
  field_8207: string // Vertragslink
  field_8218: string // Buch_2
  field_8219: string // Seite_2
  field_8220: string // Übung_2
}

// Vereinfachte Schüler-Struktur für die App
export interface SchülerApp {
  id: number
  vorname: string
  nachname: string
  geburtsdatum: string
  unterrichtstag: string
  unterrichtszeit: string
  buch: string
  seite: string
  übung: string
  aktuelleLieder: string
  wichtigerFokus: string // field_7839
  monatlicherbetrag: string
  anfrageStatus: string
  zahlungStatus: string
  startdatum: string // field_7827
  ansprechpartner: string
  handynummer: string
  email: string
  vertragslink: string
  buch2: string // field_8173
  seite2: string // field_8174
  übung2: string // field_8175
}

// API Helper Funktionen - alle über Server-Side API Routes
export class BaserowAPI {
  // Alle Schüler laden (über /api/students)
  static async getAllStudents(): Promise<Schüler[]> {
    try {
      const response = await fetch('/api/students')

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Fehler beim Laden der Schüler:', error)
      throw error
    }
  }

  // Schüler-Feld updaten (über /api/students PATCH)
  static async updateStudentField(id: number, fieldName: string, value: string | number): Promise<Schüler> {
    try {
      const response = await fetch('/api/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id, fieldName, value })
      })

      if (!response.ok) {
        throw new Error(`API Update Error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Fehler beim Update von Schüler ${id}:`, error)
      throw error
    }
  }
}

// Helper: Baserow-Daten zu App-Format konvertieren
export function convertToAppFormat(baserowStudent: Schüler): SchülerApp {
  return {
    id: baserowStudent.id,
    vorname: baserowStudent.field_7818 || '',
    nachname: baserowStudent.field_7819 || '',
    geburtsdatum: baserowStudent.field_7820 || '',
    unterrichtstag: baserowStudent.field_7832?.value || '',
    unterrichtszeit: baserowStudent.field_7833 || '',
    buch: baserowStudent.field_7835 || '',
    seite: baserowStudent.field_7836 || '',
    übung: baserowStudent.field_7837 || '',
    aktuelleLieder: baserowStudent.field_7838 || '',
    wichtigerFokus: baserowStudent.field_7839 || '', // NEU: field_7839 → Wichtiger Fokus
    monatlicherbetrag: baserowStudent.field_7840 || '',
    anfrageStatus: baserowStudent.field_7845?.value || '',
    zahlungStatus: baserowStudent.field_7858?.value || 'unbekannt',
    startdatum: baserowStudent.field_7827 || '',
    ansprechpartner: baserowStudent.field_7830 || '',
    handynummer: baserowStudent.field_7831 || '',
    email: baserowStudent.field_7854 || '',
    vertragslink: baserowStudent.field_7853 || '',
    buch2: baserowStudent.field_8173 || '',
    seite2: baserowStudent.field_8174 || '',
    übung2: baserowStudent.field_8175 || '',
  }
}

// Helper: Aktuelle Uhrzeit mit Unterrichtszeit vergleichen
export function isCurrentStudent(unterrichtszeit: string, minutesEarly: number = 5): boolean {
  if (!unterrichtszeit) return false
  
  const now = new Date()
  const currentDay = now.getDay() // 0=Sonntag, 1=Montag, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes()
  
  // Parse "16:30-17:45" Format
  const timeMatch = unterrichtszeit.match(/(\d{1,2}):(\d{2})/)
  if (!timeMatch) return false
  
  const startHour = parseInt(timeMatch[1])
  const startMinute = parseInt(timeMatch[2])
  const startTime = startHour * 60 + startMinute
  
  // 5 Minuten vor Unterrichtsbeginn bis Ende
  const earlyStartTime = startTime - minutesEarly
  
  return currentTime >= earlyStartTime && currentTime <= startTime + 60 // +60min Puffer
}

// Helper: Wochentag deutsch zu Nummer
export function getDayNumber(germanDay: string): number {
  const days: { [key: string]: number } = {
    'Montag': 1,
    'Dienstag': 2, 
    'Mittwoch': 3,
    'Donnerstag': 4,
    'Freitag': 5,
    'Samstag': 6,
    'Sonntag': 0
  }
  return days[germanDay] || -1
}