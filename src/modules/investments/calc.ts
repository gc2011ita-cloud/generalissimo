// Calcoli delle posizioni finanziarie (funzioni pure). Indipendenti da entrate e spese.

import { round2 } from '../../lib/format'

export interface ValueLike {
  holdingId: string
  date: string
  invested: number
  value: number
  updatedAt: string
  deletedAt: string | null
}

const newer = (a: ValueLike, b: ValueLike) => a.date > b.date || (a.date === b.date && a.updatedAt > b.updatedAt)

/** Ultimo aggiornamento di ogni posizione, fino alla data indicata inclusa. */
export function latestByHolding<V extends ValueLike>(values: readonly V[], upTo?: string): Map<string, V> {
  const out = new Map<string, V>()
  for (const v of values) {
    if (v.deletedAt !== null || (upTo && v.date > upTo)) continue
    const cur = out.get(v.holdingId)
    if (!cur || newer(v, cur)) out.set(v.holdingId, v)
  }
  return out
}

export interface PositionSummary {
  holdingId: string
  date: string
  invested: number
  value: number
  gain: number
  /** Rendimento sul capitale versato, in % (null se versato = 0) */
  gainPct: number | null
  closed: boolean
}

const pct = (gain: number, invested: number) => (invested > 0 ? round2((gain / invested) * 100) : null)

export function portfolioSummary(holdingIds: readonly string[], values: readonly ValueLike[]) {
  const latest = latestByHolding(values.filter((v) => holdingIds.includes(v.holdingId)))
  const rows: PositionSummary[] = holdingIds
    .filter((id) => latest.has(id))
    .map((id) => {
      const v = latest.get(id)!
      const gain = round2(v.value - v.invested)
      return { holdingId: id, date: v.date, invested: v.invested, value: v.value, gain, gainPct: pct(gain, v.invested), closed: v.value === 0 && v.invested === 0 }
    })
    .sort((a, b) => b.value - a.value)
  const invested = round2(rows.reduce((s, r) => s + r.invested, 0))
  const value = round2(rows.reduce((s, r) => s + r.value, 0))
  const gain = round2(value - invested)
  return { rows, invested, value, gain, gainPct: pct(gain, invested) }
}

/**
 * Andamento del portafoglio: a ogni data con almeno un aggiornamento, somma
 * dell'ultimo valore noto di ciascuna posizione (le posizioni non ancora inserite contano 0).
 */
export function portfolioSeries(holdingIds: readonly string[], values: readonly ValueLike[]) {
  const mine = values.filter((v) => v.deletedAt === null && holdingIds.includes(v.holdingId))
  const dates = [...new Set(mine.map((v) => v.date))].sort()
  return dates.map((date) => {
    const latest = latestByHolding(mine, date)
    let invested = 0
    let value = 0
    for (const v of latest.values()) {
      invested += v.invested
      value += v.value
    }
    return { date, invested: round2(invested), value: round2(value), gain: round2(value - invested) }
  })
}
