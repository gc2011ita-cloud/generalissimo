// Calcoli del diario (funzioni pure).

import { isoWeekKey, parseISODate, toISODate } from '../../lib/dates'
import { round2 } from '../../lib/format'
import type { CheckInQuestion } from '../../db/schema'

/** Risposte iniziali del check-in: quelle salvate, altrimenti precompilate dagli altri moduli. */
export function prefillAnswers(
  questions: readonly CheckInQuestion[],
  saved: Record<string, boolean> | undefined,
  facts: { workout: boolean; study: boolean },
): Record<string, boolean | undefined> {
  const out: Record<string, boolean | undefined> = {}
  for (const q of questions) {
    if (saved && q.id in saved) out[q.id] = saved[q.id]
    else if (q.auto === 'workout' && facts.workout) out[q.id] = true
    else if (q.auto === 'study' && facts.study) out[q.id] = true
    else out[q.id] = undefined
  }
  return out
}

/** Id stabile per una nuova domanda a partire dal testo. */
export function questionId(label: string, existing: readonly string[]) {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'domanda'
  let id = base
  for (let i = 2; existing.includes(id); i++) id = `${base}-${i}`
  return id
}

export interface HeatCell {
  date: string
  score: number | null
  inRange: boolean
}

/**
 * Griglia della mappa di calore: colonne = settimane (lunedì in alto), ultime `weeks`
 * settimane fino a `today`. I giorni dopo oggi hanno inRange = false.
 */
export function heatmapGrid(scores: ReadonlyMap<string, number>, today: string, weeks: number): HeatCell[][] {
  const t = parseISODate(today)
  const mondayOffset = (t.getDay() + 6) % 7
  const start = new Date(t.getFullYear(), t.getMonth(), t.getDate() - mondayOffset - (weeks - 1) * 7)
  const cols: HeatCell[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = []
    for (let d = 0; d < 7; d++) {
      const date = toISODate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d))
      col.push({ date, score: scores.get(date) ?? null, inRange: date <= today })
    }
    cols.push(col)
  }
  return cols
}

/** Media del voto per settimana ISO o per mese. */
export function averageBy(
  entries: readonly { date: string; overallScore: number | null }[],
  period: 'week' | 'month',
): { period: string; average: number; days: number }[] {
  const map = new Map<string, { sum: number; n: number }>()
  for (const e of entries) {
    if (e.overallScore == null) continue
    const k = period === 'week' ? isoWeekKey(e.date) : e.date.slice(0, 7)
    const cur = map.get(k) ?? { sum: 0, n: 0 }
    cur.sum += e.overallScore
    cur.n++
    map.set(k, cur)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, { sum, n }]) => ({ period: p, average: round2(sum / n), days: n }))
}

/** Livello di colore 0–4 per un voto 1–10 (null = nessun check-in). */
export function scoreLevel(score: number | null): number {
  if (score == null) return 0
  if (score <= 4) return 1
  if (score <= 6) return 2
  if (score <= 8) return 3
  return 4
}

/** Data del check-in proposto: dopo le 4 del mattino oggi, prima ancora ieri (sera lunga). */
export function checkInDate(now: Date): string {
  const d = new Date(now)
  if (d.getHours() < 4) d.setDate(d.getDate() - 1)
  return toISODate(d)
}
