/**
 * Birthday helpers – client-side only, no API call needed.
 * geburtsdatum format: YYYY-MM-DD (Baserow standard)
 *
 * WICHTIG: Wir parsen das Datum-String direkt (split '-'), um Timezone-Probleme
 * zu vermeiden. new Date("YYYY-MM-DD") wird als UTC interpretiert, was je nach
 * Timezone zu falschen getDate()/getMonth()-Werten führen kann.
 */

/** Returns the current age in full years, or null if no date given. */
export function calcAge(geburtsdatum: string | null | undefined): number | null {
  if (!geburtsdatum) return null

  // Timezone-sicheres Parsen: direkt aus String, kein new Date(string)
  const parts = geburtsdatum.split('-')
  if (parts.length < 3) return null
  const bYear = parseInt(parts[0], 10)
  const bMonth = parseInt(parts[1], 10) // 1-indexed
  const bDay = parseInt(parts[2], 10)
  if (isNaN(bYear) || isNaN(bMonth) || isNaN(bDay)) return null

  const today = new Date()
  const tYear = today.getFullYear()
  const tMonth = today.getMonth() + 1 // 1-indexed
  const tDay = today.getDate()

  let age = tYear - bYear
  if (tMonth < bMonth || (tMonth === bMonth && tDay < bDay)) {
    age--
  }
  return age
}

/**
 * Returns true if the last birthday (this or previous year) falls within
 * the last `days` days (inclusive of today).
 * Handles Feb 29 in non-leap years by treating it as Mar 1.
 */
export function hadRecentBirthday(
  geburtsdatum: string | null | undefined,
  days = 14
): boolean {
  if (!geburtsdatum) return false

  // Timezone-sicheres Parsen
  const parts = geburtsdatum.split('-')
  if (parts.length < 3) return false
  const bYear = parseInt(parts[0], 10)
  const bMonth = parseInt(parts[1], 10) // 1-indexed
  const bDay = parseInt(parts[2], 10)
  if (isNaN(bYear) || isNaN(bMonth) || isNaN(bDay)) return false

  const today = new Date()
  const tYear = today.getFullYear()
  const tMonth = today.getMonth() + 1 // 1-indexed
  const tDay = today.getDate()

  // Fensterbeginn: heute - days Tage
  const windowDate = new Date(today)
  windowDate.setDate(windowDate.getDate() - days)
  const wYear = windowDate.getFullYear()
  const wMonth = windowDate.getMonth() + 1 // 1-indexed
  const wDay = windowDate.getDate()

  // Feb 29 → in Nicht-Schaltjahren als 1. März behandeln
  const isFeb29 = bMonth === 2 && bDay === 29
  const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

  for (const year of [tYear, tYear - 1]) {
    let month = bMonth
    let day = bDay
    if (isFeb29 && !isLeapYear(year)) {
      month = 3 // März
      day = 1
    }

    // Vergleich als YYYYMMDD-Integer → 100% timezone-safe, kein Date-Objekt nötig
    const bdNum = year * 10000 + month * 100 + day
    const todayNum = tYear * 10000 + tMonth * 100 + tDay
    const windowNum = wYear * 10000 + wMonth * 100 + wDay

    if (bdNum >= windowNum && bdNum <= todayNum) return true
  }
  return false
}
