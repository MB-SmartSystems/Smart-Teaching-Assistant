import { NextRequest, NextResponse } from 'next/server'

const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL
const BASEROW_TOKEN = process.env.BASEROW_TOKEN
const FLEX_TABLE_ID = "841"
const N8N_WEBHOOK_URL = process.env.N8N_FLEXKARTE_WEBHOOK_URL

// Baserow erlaubt max 1 Dezimalstelle bei Stunden-Feldern
function formatDecimal(value: number): string {
  if (value % 1 === 0) return value.toString()
  return value.toFixed(1)
}

// Mapping: Kartentyp-String -> Baserow single_select Option-ID
const KARTENTYP_MAP: Record<string, number> = {
  '2-Std (125€)': 3289,
  '5-Std (305€)': 3290,
  '10-Std (595€)': 3291,
  // Fallback für alte Preise
  '2-Std (110€)': 3289,
  '5-Std (260€)': 3290,
  '10-Std (500€)': 3291,
}

export async function POST(request: NextRequest) {
  if (!BASEROW_TOKEN || !BASEROW_BASE_URL) {
    return NextResponse.json({ error: 'Server-Konfiguration fehlt' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { schueler_id, kartentyp, gekauft_am, preis, kontingent_stunden } = body

    // Validierung
    if (!Number.isInteger(schueler_id) || schueler_id <= 0) {
      return NextResponse.json({ error: 'Ungültige Schüler-ID' }, { status: 400 })
    }

    if (!kartentyp || !KARTENTYP_MAP[kartentyp]) {
      return NextResponse.json({ error: 'Ungültiger Kartentyp' }, { status: 400 })
    }

    if (!gekauft_am || !/^\d{4}-\d{2}-\d{2}$/.test(gekauft_am)) {
      return NextResponse.json({ error: 'Ungültiges Kaufdatum' }, { status: 400 })
    }

    if (typeof preis !== 'number' || preis <= 0) {
      return NextResponse.json({ error: 'Ungültiger Preis' }, { status: 400 })
    }

    if (typeof kontingent_stunden !== 'number' || kontingent_stunden <= 0) {
      return NextResponse.json({ error: 'Ungültiges Kontingent' }, { status: 400 })
    }

    // Gültig bis: 6 Monate ab Kaufdatum
    const kaufDate = new Date(gekauft_am)
    kaufDate.setMonth(kaufDate.getMonth() + 6)
    const gueltigBis = kaufDate.toISOString().split('T')[0]

    // Baserow-Row erstellen
    const baserowPayload = {
      Karten_Typ: KARTENTYP_MAP[kartentyp],
      Gekauft_am: gekauft_am,
      Gueltig_bis: gueltigBis,
      Kontingent_Stunden: formatDecimal(kontingent_stunden),
      Preis_EUR: preis.toFixed(2),
      Rest_Stunden: formatDecimal(kontingent_stunden),
      Verbrauchte_Stunden: '0',
      Schueler_Link: [schueler_id],
      Status: 3299, // "Aktiv"
      Bezahlt: 3293, // "Nein" (default, wird manuell auf Ja gesetzt)
      Preismodelle: 3288, // "Neukundentarif (ab 16.02.2026)"
    }

    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${FLEX_TABLE_ID}/?user_field_names=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(baserowPayload)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Baserow Create Error:', errorText)
      return NextResponse.json(
        { error: 'Baserow Fehler', details: errorText },
        { status: 502 }
      )
    }

    const data = await response.json()

    // Optional: n8n Webhook benachrichtigen
    if (N8N_WEBHOOK_URL) {
      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'flex_karte_gebucht',
            schueler_id,
            kartentyp,
            gekauft_am,
            preis,
            kontingent_stunden,
            gueltig_bis: gueltigBis,
            baserow_id: data.id,
          })
        })
      } catch (webhookError) {
        console.error('n8n Webhook Fehler:', webhookError)
        // Nicht als Fehler zurückgeben - Baserow-Eintrag war erfolgreich
      }
    }

    // Validation: GET Request auf die neue Row um Speicherung zu prüfen
    let validated = false
    try {
      const validateRes = await fetch(
        `${BASEROW_BASE_URL}/api/database/rows/table/${FLEX_TABLE_ID}/${data.id}/?user_field_names=true`,
        {
          headers: {
            'Authorization': `Token ${BASEROW_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )
      if (validateRes.ok) {
        const row = await validateRes.json()
        // Prüfe ob Schüler-Link korrekt gespeichert
        validated = row.Schueler_Link?.some((s: { id: number }) => s.id === schueler_id) ?? false
      }
    } catch (valErr) {
      console.warn('Validation GET fehlgeschlagen:', valErr)
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      validated,
      ...(validated ? {} : { warning: 'Eintrag erstellt, aber Validierung fehlgeschlagen. Bitte in Baserow prüfen.' }),
    })
  } catch (error) {
    console.error('Fehler beim Buchen der Flex-Karte:', error)
    return NextResponse.json(
      { error: 'Fehler beim Buchen der Flex-Karte' },
      { status: 500 }
    )
  }
}
