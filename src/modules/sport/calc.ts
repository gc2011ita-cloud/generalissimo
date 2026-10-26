// Giorni di sport e calendario (funzioni pure).

import { parseISODate, toISODate } from '../../lib/dates'

/**
 * Giorni con sport: la risposta "sì/no" del giorno vince; senza risposta conta
 * un allenamento registrato in quella data.
 */
export function sportDaySet(
  answers: readonly { date: string; trained: boolean | undefined }[],
  workoutDates: readonly string[],
): Set<string> {
  const explicit = new Map(answers.filter((a) => a.trained !== undefined).map((a) => [a.date, a.trained!]))
  const out = new Set<string>()
  for (const [d, v] of explicit) if (v) out.add(d)
  for (const d of workoutDates) if (!explicit.has(d)) out.add(d)
  return out
}

export function countBetween(days: ReadonlySet<string>, from: string, to: string) {
  let n = 0
  for (const d of days) if (d >= from && d <= to) n++
  return n
}

/** Settimane (lunedì–domenica) che coprono il mese 'YYYY-MM'. */
export function monthWeeks(month: string): { date: string; inMonth: boolean }[][] {
  const first = parseISODate(`${month}-01`)
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - ((first.getDay() + 6) % 7))
  const weeks: { date: string; inMonth: boolean }[][] = []
  for (let w = 0; w < 6; w++) {
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i)
      return { date: toISODate(d), inMonth: d.getMonth() === first.getMonth() }
    })
    if (week.some((d) => d.inMonth)) weeks.push(week)
  }
  return weeks
}
