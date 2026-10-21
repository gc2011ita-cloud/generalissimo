/** Data locale 'YYYY-MM-DD' (non UTC: a mezzanotte italiana il giorno deve cambiare). */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Settimana ISO 8601 come 'YYYY-Www' (lunedì primo giorno). */
export function isoWeekKey(date: string): string {
  const d = parseISODate(date)
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = Date.UTC(target.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((target.getTime() - yearStart) / 86_400_000 + 1) / 7)
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Giorni di calendario interi tra due istanti (ora locale). */
export function daysBetween(from: Date, to: Date): number {
  const a = parseISODate(toISODate(from)).getTime()
  const b = parseISODate(toISODate(to)).getTime()
  return Math.round((b - a) / 86_400_000)
}
