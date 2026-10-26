// Spese ricorrenti: date in cui generare i movimenti (funzioni pure).

import { parseISODate, toISODate } from '../../lib/dates'
import type { RecurringFrequency } from '../../db/schema'

export interface RecurringLike {
  frequency: RecurringFrequency
  /** monthly/yearly: giorno del mese (31 = ultimo giorno); weekly: 1 = lunedì … 7 = domenica */
  dayOfPeriod: number
  startDate: string
  endDate: string | null
}

const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

/** Date di scadenza dopo `after` (esclusa) e fino a `upTo` (inclusa), dentro [startDate, endDate]. */
export function occurrences(r: RecurringLike, after: string | null, upTo: string): string[] {
  const from = after && after >= r.startDate ? after : null
  const end = r.endDate && r.endDate < upTo ? r.endDate : upTo
  const out: string[] = []
  const ok = (d: string) => d >= r.startDate && d <= end && (!from || d > from)
  const s = parseISODate(r.startDate)

  if (r.frequency === 'weekly') {
    const target = ((r.dayOfPeriod % 7) + 7) % 7 // 7 → domenica (0)
    const d = new Date(s)
    while (d.getDay() !== target) d.setDate(d.getDate() + 1)
    for (; toISODate(d) <= end; d.setDate(d.getDate() + 7)) if (ok(toISODate(d))) out.push(toISODate(d))
    return out
  }

  const step = r.frequency === 'monthly' ? 1 : 12
  for (let y = s.getFullYear(), m = s.getMonth(); ; m += step) {
    const yy = y + Math.floor(m / 12)
    const mm = ((m % 12) + 12) % 12
    const date = toISODate(new Date(yy, mm, Math.min(r.dayOfPeriod, lastDay(yy, mm))))
    if (date > end) break
    if (ok(date)) out.push(date)
  }
  return out
}
