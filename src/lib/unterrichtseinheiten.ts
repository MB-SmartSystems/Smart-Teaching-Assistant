// Unterrichtseinheiten Integration (Baserow Tabelle 842)
// Ausschließlich für Flex-Karten-Einheiten, NICHT für regulären Unterricht

export interface Unterrichtseinheit {
  id: number
  Einheit_ID: number
  Datum: string
  Uhrzeit: string
  Dauer_Stunden: string
  Unterrichtsinhalte: string
  Fortschritt: { id: number; value: string; color: string } | null
  Notizen: string
  Status: { id: number; value: string; color: string } | null
  Schueler_Link: { id: number; value: string }[]
  Flexkarte_Link: { id: number; value: string }[]
}

// Fortschritt-Optionen (Sterne) aus Table 842
export const FORTSCHRITT_OPTIONS = {
  1: { id: 3308, label: '⭐' },
  2: { id: 3309, label: '⭐⭐' },
  3: { id: 3310, label: '⭐⭐⭐' },
  4: { id: 3311, label: '⭐⭐⭐⭐' },
  5: { id: 3312, label: '⭐⭐⭐⭐⭐' },
} as const

// Status-Optionen aus Table 842
export const STATUS_OPTIONS = {
  stattgefunden: 3303,
  ausgefallen_schueler: 3304,
  ausgefallen_lehrer: 3305,
  nachzuholen: 3306,
  nachgeholt: 3307,
} as const

// Alle Einheiten für eine Flex-Karte laden
export async function fetchUnterrichtseinheiten(flexkarteId: number): Promise<Unterrichtseinheit[]> {
  try {
    const response = await fetch(`/api/unterrichtseinheiten?flexkarte_id=${flexkarteId}`)
    if (!response.ok) throw new Error(`API Error: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Fehler beim Laden der Unterrichtseinheiten:', error)
    return []
  }
}

// Neue Unterrichtseinheit erstellen
export async function createUnterrichtseinheit(data: {
  datum: string
  uhrzeit?: string
  dauer: string
  unterrichtsinhalte?: string
  fortschritt?: number
  notizen?: string
  schueler_id?: number
  flexkarte_id: number
}): Promise<Unterrichtseinheit | null> {
  try {
    const response = await fetch('/api/unterrichtseinheiten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        status: STATUS_OPTIONS.stattgefunden, // Default: Stattgefunden
      })
    })
    if (!response.ok) throw new Error(`API Error: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Fehler beim Erstellen der Unterrichtseinheit:', error)
    return null
  }
}

// Baserow erlaubt max 1 Dezimalstelle bei Stunden-Feldern
function formatDecimal(value: number): string {
  if (value % 1 === 0) return value.toString()
  return value.toFixed(1)
}

// Verbrauchte Stunden auf Flex-Karte aktualisieren
export async function updateFlexKarteStunden(
  karteId: number,
  neueVerbrauchteStunden: number,
  neueRestStunden: number
): Promise<boolean> {
  try {
    const response = await fetch('/api/flex-karten', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        karteId,
        updates: {
          Verbrauchte_Stunden: formatDecimal(neueVerbrauchteStunden),
          Rest_Stunden: formatDecimal(neueRestStunden),
        }
      })
    })
    if (!response.ok) throw new Error(`API Error: ${response.status}`)
    return true
  } catch (error) {
    console.error('Fehler beim Update der Flex-Karte:', error)
    return false
  }
}

// Dauer als lesbaren String formatieren
export function formatDauer(stunden: string): string {
  const h = parseFloat(stunden || '0')
  if (h === 0) return '0h'
  if (h === 1) return '1 Std'
  if (h < 1) return `${Math.round(h * 60)} Min`
  const ganzeStunden = Math.floor(h)
  const restMinuten = Math.round((h - ganzeStunden) * 60)
  if (restMinuten === 0) return `${ganzeStunden} Std`
  return `${ganzeStunden}h ${restMinuten}min`
}

// Fortschritt als Sterne-String
export function getFortschrittStars(fortschritt: Unterrichtseinheit['Fortschritt']): string {
  if (!fortschritt) return ''
  return fortschritt.value || ''
}
