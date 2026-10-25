// Periodi di visualizzazione: giorno, settimana (lun–dom), mese, anno.

import { parseISODate, toISODate } from './dates'

export type PeriodKind = 'day' | 'week' | 'month' | 'year'

export interface Range {
  from: string
  to: string
}

const shiftDays = (date: string, n: number) => {
  const d = parseISODate(date)
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n))
}

export function rangeFor(kind: PeriodKind, anchor: string): Range {
  const d = parseISODate(anchor)
  switch (kind) {
    case 'day':
      return { from: anchor, to: anchor }
    case 'week': {
      const monday = shiftDays(anchor, -((d.getDay() + 6) % 7))
      return { from: monday, to: shiftDays(monday, 6) }
    }
    case 'month':
      return {
        from: toISODate(new Date(d.getFullYear(), d.getMonth(), 1)),
        to: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      }
    case 'year':
      return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` }
  }
}

export function shiftAnchor(kind: PeriodKind, anchor: string, delta: number): string {
  const d = parseISODate(anchor)
  switch (kind) {
    case 'day':
      return shiftDays(anchor, delta)
    case 'week':
      return shiftDays(anchor, delta * 7)
    case 'month':
      return toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1))
    case 'year':
      return toISODate(new Date(d.getFullYear() + delta, 0, 1))
  }
}

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) => parseISODate(date).toLocaleDateString('it-IT', opts)

export function rangeLabel(kind: PeriodKind | 'custom', r: Range): string {
  switch (kind) {
    case 'day':
      return fmt(r.from, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    case 'month':
      return fmt(r.from, { month: 'long', year: 'numeric' })
    case 'year':
      return r.from.slice(0, 4)
    default: {
      const sameYear = r.from.slice(0, 4) === r.to.slice(0, 4)
      const a = fmt(r.from, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
      const b = fmt(r.to, { day: 'numeric', month: 'short', year: 'numeric' })
      return `${a} – ${b}`
    }
  }
}

/** Primo giorno di ogni periodo da `from` a `to` inclusi. */
export function periodStarts(kind: PeriodKind, from: string, to: string): string[] {
  const out: string[] = []
  for (let a = rangeFor(kind, from).from; a <= to; a = shiftAnchor(kind, a, 1)) {
    out.push(rangeFor(kind, a).from)
  }
  return out
}
