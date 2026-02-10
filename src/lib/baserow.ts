// Baserow API Integration für Smart Teaching Assistant

const BASEROW_BASE_URL = "https://baserow.mb-smartsystems.de"
const BASEROW_DATABASE_ID = "233"
const BASEROW_TABLE_ID = "831"
const BASEROW_TOKEN = "3jzvKnX08FXtXMtFNweGRaMoJHhDQFeb"

// Schüler-Datentyp basierend auf Baserow-Feldern
export interface Schüler {
  id: number
  order: string
  field_7818: string // Vorname
  field_7819: string // Nachname
  field_7820: string // Geburtsdatum
  field_7821: string // Alter
  field_7832: { id: number; value: string; color: string } | null // Unterrichtstag
  field_7833: string // Unterrichtszeit
  field_7835: string // Buch
  field_7836: string // Seite
  field_7837: string // Übung
  field_7838: string // Aktuelle_Lieder
  field_7839: string // Größter_Bedarf (→ Wichtiger Fokus)
  field_7840: string // Monatlicher_Betrag
  field_7845: { id: number; value: string; color: string } | null // Anfrage_Status
  field_7858: { id: number; value: string; color: string } | null // Zahlung läuft?
  field_7830: string // Ansprechpartner_Name
  field_7831: string // Handynummer_Ansprechpartner
  field_7854: string // Email_Ansprechpartner
  field_7853: string // Vertragslink
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
  ansprechpartner: string
  handynummer: string
  email: string
  vertragslink: string
}

// API Helper Funktionen
export class BaserowAPI {
  private static headers = {
    'Authorization': `Token ${BASEROW_TOKEN}`,
    'Content-Type': 'application/json'
  }

  // Alle Schüler laden
  static async getAllStudents(): Promise<Schüler[]> {
    try {
      const response = await fetch(
        `${BASEROW_BASE_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/`,
        { headers: this.headers }
      )
      
      if (!response.ok) {
        throw new Error(`Baserow API Error: ${response.status}`)
      }
      
      const data = await response.json()
      return data.results
    } catch (error) {
      console.error('Fehler beim Laden der Schüler:', error)
      throw error
    }
  }

  // Einzelnen Schüler laden
  static async getStudent(id: number): Promise<Schüler> {
    try {
      const response = await fetch(
        `${BASEROW_BASE_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/${id}/`,
        { headers: this.headers }
      )
      
      if (!response.ok) {
        throw new Error(`Baserow API Error: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error(`Fehler beim Laden von Schüler ${id}:`, error)
      throw error
    }
  }

  // Schüler-Feld updaten
  static async updateStudentField(id: number, fieldName: string, value: string): Promise<Schüler> {
    try {
      const response = await fetch(
        `${BASEROW_BASE_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/${id}/`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({ [fieldName]: value })
        }
      )
      
      if (!response.ok) {
        throw new Error(`Baserow Update Error: ${response.status}`)
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
    ansprechpartner: baserowStudent.field_7830 || '',
    handynummer: baserowStudent.field_7831 || '',
    email: baserowStudent.field_7854 || '',
    vertragslink: baserowStudent.field_7853 || '',
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