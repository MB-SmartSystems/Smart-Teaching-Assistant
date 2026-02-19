// Flex-Karten Integration (Baserow Tabelle 841)

export interface FlexKarte {
  id: number
  Karten_ID: string
  Schueler_Link: { id: number; value: string }[]
  Karten_Typ: { id: number; value: string; color: string } | null
  Gekauft_am: string
  Gueltig_bis: string
  Kontingent_Stunden: string
  Verbrauchte_Stunden: string
  Rest_Stunden: string
  Preis_EUR: string
  Bezahlt: { id: number; value: string; color: string } | null
  Zahlungsart: { id: number; value: string; color: string } | null
  Status: { id: number; value: string; color: string } | null
  Rechnungsnummer: string
  Notizen: string
  Preismodelle: { id: number; value: string; color: string } | null
}

export async function fetchFlexKarten(): Promise<FlexKarte[]> {
  try {
    const response = await fetch('/api/flex-karten')
    if (!response.ok) throw new Error(`API Error: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Fehler beim Laden der Flex-Karten:', error)
    return []
  }
}

export function getRestStunden(karte: FlexKarte): number {
  return parseFloat(karte.Rest_Stunden || '0')
}

export function getKontingent(karte: FlexKarte): number {
  return parseFloat(karte.Kontingent_Stunden || '0')
}

export function getVerbraucht(karte: FlexKarte): number {
  return parseFloat(karte.Verbrauchte_Stunden || '0')
}

export function isLowBalance(karte: FlexKarte): boolean {
  return getRestStunden(karte) < 3
}

export function isExpired(karte: FlexKarte): boolean {
  if (!karte.Gueltig_bis) return false
  return new Date(karte.Gueltig_bis) < new Date()
}

export function getSchuelerName(karte: FlexKarte): string {
  return karte.Schueler_Link?.[0]?.value || 'Unbekannt'
}
