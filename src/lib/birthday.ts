/**
 * Birthday helpers – client-side only, no API call needed.
 * geburtsdatum format: YYYY-MM-DD (Baserow standard)
 */

/** Returns the current age in full years, or null if no date given. */
export function calcAge(geburtsdatum: string | null | undefined): number | null {
  if (!geburtsdatum) return null
  const today = new Date()
  const birth = new Date(geburtsdatum)
  if (isNaN(birth.getTime())) return null

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
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
  const birth = new Date(geburtsdatum)
  if (isNaN(birth.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const windowStart = new Date(today)
  windowStart.setDate(windowStart.getDate() - days)

  // Try birthday in current year
  let bMonth = birth.getMonth()
  let bDay = birth.getDate()

  // Feb 29 → treat as Mar 1 in non-leap years
  const isFeb29 = bMonth === 1 && bDay === 29
  const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

  for (const year of [today.getFullYear(), today.getFullYear() - 1]) {
    let month = bMonth
    let day = bDay
    if (isFeb29 && !isLeapYear(year)) {
      month = 2 // March
      day = 1
    }
    const lastBirthday = new Date(year, month, day)
    if (lastBirthday >= windowStart && lastBirthday <= today) {
      return true
    }
  }
  return false
}
