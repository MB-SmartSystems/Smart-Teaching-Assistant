// Preiserhöhungs-Tracking (Baserow Tabelle 839)

export interface Preiserhoehung {
  id: number
  ID: string
  Schueler_Link: { id: number; value: string }[]
  Aktueller_Preis_EUR: string
  Neuer_Preis_EUR: string
  Differenz_EUR: string
  Status: { id: number; value: string; color: string } | null
  Versand_Datum: string | null
  Versand_Kanal: { id: number; value: string; color: string } | null
  Nachricht_Text: string
  Antwort_erhalten_am: string | null
  Antwort_Text: string
  Umsetzung_ab_Datum: string
  Notizen: string
}

export async function fetchPreiserhoehungen(): Promise<Preiserhoehung[]> {
  try {
    const response = await fetch('/api/preiserhoehungen')
    if (!response.ok) throw new Error(`API Error: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Fehler beim Laden der Preiserhöhungen:', error)
    return []
  }
}

export function getSchuelerName(pe: Preiserhoehung): string {
  return pe.Schueler_Link?.[0]?.value || 'Unbekannt'
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Vorbereitet': return 'var(--status-warning)'
    case 'Nachricht versendet': return '#3b82f6'
    case 'Antwort erhalten': return '#8b5cf6'
    case 'Akzeptiert': return 'var(--status-success)'
    case 'Verhandlung läuft': return 'var(--status-warning)'
    case 'Abgelehnt': return 'var(--status-error)'
    case 'Umgesetzt': return 'var(--primary)'
    default: return 'var(--status-neutral)'
  }
}

export function getTotalDifferenz(items: Preiserhoehung[]): number {
  return items.reduce((sum, pe) => sum + parseFloat(pe.Differenz_EUR || '0'), 0)
}
