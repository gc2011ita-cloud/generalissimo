// Stato degli obiettivi (funzioni pure): valore atteso, pause, soglie della spec.

import { parseISODate, toISODate } from '../../lib/dates'
import type { GoalStatus, GoalThresholds, Pause } from '../../db/schema'

export const isPaused = (date: string, pauses: readonly Pause[]) => pauses.some((p) => date >= p.from && date <= p.to)

/** Giorni non in pausa tra from e to inclusi. */
export function activeDays(from: string, to: string, pauses: readonly Pause[]): number {
  if (to < from) return 0
  let n = 0
  const end = parseISODate(to).getTime()
  for (let d = parseISODate(from); d.getTime() <= end; d.setDate(d.getDate() + 1)) {
    if (!isPaused(toISODate(d), pauses)) n++
  }
  return n
}

/** Frazione di periodo trascorsa (0–1), senza contare i giorni di pausa. */
export function elapsedFraction(from: string, to: string, today: string, pauses: readonly Pause[] = []): number {
  if (today < from) return 0
  const total = activeDays(from, to, pauses)
  if (total === 0) return 1
  return Math.min(1, activeDays(from, today < to ? today : to, pauses) / total)
}

/**
 * Stato di un obiettivo "almeno": raggiunto, in linea (≥ 90% dell'atteso), in ritardo
 * (70–90%), a rischio (< 70%), fermo (manuale non aggiornato da N giorni), mancato.
 */
export function progressStatus(args: {
  current: number
  target: number
  fraction: number
  closed: boolean
  thresholds: GoalThresholds
  daysSinceUpdate?: number | null
}): GoalStatus {
  const { current, target, fraction, closed, thresholds, daysSinceUpdate } = args
  if (current >= target) return 'achieved'
  if (closed) return 'missed'
  if (daysSinceUpdate != null && daysSinceUpdate > thresholds.staleDays) return 'stale'
  const expected = target * fraction
  if (expected <= 0) return 'onTrack'
  const ratio = current / expected
  if (ratio >= thresholds.onTrack) return 'onTrack'
  if (ratio >= thresholds.behind) return 'behind'
  return 'atRisk'
}

/**
 * Budget ("al massimo"): sforato = a rischio; se la proiezione a fine mese supera
 * il limite = in ritardo (attenzione); a mese chiuso entro il limite = raggiunto.
 */
export function budgetStatus(spent: number, budget: number, fraction: number, closed: boolean): GoalStatus {
  if (spent > budget) return closed ? 'missed' : 'atRisk'
  if (closed) return 'achieved'
  const projection = fraction > 0 ? spent / fraction : spent
  return projection > budget ? 'behind' : 'onTrack'
}

/** Inizio effettivo: un obiettivo aggiunto a metà periodo si misura da quando è stato creato. */
export const effectiveStart = (periodStart: string, createdAt: string) => {
  const created = createdAt.slice(0, 10)
  return created > periodStart ? created : periodStart
}

export const NEEDS_ATTENTION: readonly GoalStatus[] = ['behind', 'atRisk', 'stale']
