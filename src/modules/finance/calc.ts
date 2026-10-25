// Calcoli delle finanze (funzioni pure).

import { round2 } from '../../lib/format'

export interface TxLike {
  date: string
  amount: number
  type: 'expense' | 'income'
  categoryId: string | null
  accountId: string | null
  tags: string[]
  deletedAt: string | null
}

const alive = <T extends { deletedAt: string | null }>(rows: readonly T[]) => rows.filter((r) => r.deletedAt === null)

export interface MonthSummary {
  month: string // 'YYYY-MM'
  income: number
  expense: number
  /** Risparmio del mese: entrate − spese */
  net: number
  /** Risparmio cumulato dal primo mese fino a questo incluso */
  cumulative: number
}

/** Riepilogo mese per mese, senza buchi tra il primo e l'ultimo mese con movimenti. */
export function monthlySummaries(txs: readonly TxLike[]): MonthSummary[] {
  const byMonth = new Map<string, { income: number; expense: number }>()
  for (const t of alive(txs)) {
    const m = t.date.slice(0, 7)
    const cur = byMonth.get(m) ?? { income: 0, expense: 0 }
    cur[t.type] += t.amount
    byMonth.set(m, cur)
  }
  if (!byMonth.size) return []
  const months = [...byMonth.keys()].sort()
  const out: MonthSummary[] = []
  let cumulative = 0
  for (let m = months[0]; m <= months.at(-1)!; m = nextMonth(m)) {
    const { income, expense } = byMonth.get(m) ?? { income: 0, expense: 0 }
    const net = round2(income - expense)
    cumulative = round2(cumulative + net)
    out.push({ month: m, income: round2(income), expense: round2(expense), net, cumulative })
  }
  return out
}

function nextMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`
}

/** Saldo di un conto alla data indicata (inclusa): saldo iniziale + entrate − spese. */
export function accountBalance(openingBalance: number, accountId: string, txs: readonly TxLike[], upTo?: string) {
  let b = openingBalance
  for (const t of alive(txs)) {
    if (t.accountId !== accountId || (upTo && t.date > upTo)) continue
    b += t.type === 'income' ? t.amount : -t.amount
  }
  return round2(b)
}

/** Totale per chiave (categoria o tag) in un intervallo di date [from, to], ordinato dal maggiore. */
export function totalsBy(
  txs: readonly TxLike[],
  type: 'expense' | 'income',
  key: 'category' | 'tag',
  from: string,
  to: string,
): { key: string; total: number }[] {
  const map = new Map<string, number>()
  for (const t of alive(txs)) {
    if (t.type !== type || t.date < from || t.date > to) continue
    const keys = key === 'category' ? [t.categoryId ?? ''] : t.tags.length ? t.tags : ['']
    for (const k of keys) map.set(k, (map.get(k) ?? 0) + t.amount)
  }
  return [...map.entries()].map(([k, total]) => ({ key: k, total: round2(total) })).sort((a, b) => b.total - a.total)
}

/** Somma per tipo in un intervallo di date. */
export function sumBetween(txs: readonly TxLike[], type: 'expense' | 'income', from: string, to: string) {
  return round2(alive(txs).reduce((s, t) => (t.type === type && t.date >= from && t.date <= to ? s + t.amount : s), 0))
}

/** Tag più usati, per i suggerimenti nell'inserimento. */
export function tagUsage(txs: readonly TxLike[]): string[] {
  const count = new Map<string, number>()
  for (const t of alive(txs)) for (const tag of t.tags) count.set(tag, (count.get(tag) ?? 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t)
}

/** Ordina le categorie: prima le più usate negli ultimi movimenti, poi per ordine impostato. */
export function categoriesByRecentUse<C extends { id: string; order: number }>(
  categories: readonly C[],
  recentTxs: readonly { categoryId: string | null }[],
): C[] {
  const uses = new Map<string, number>()
  for (const t of recentTxs) if (t.categoryId) uses.set(t.categoryId, (uses.get(t.categoryId) ?? 0) + 1)
  return [...categories].sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.order - b.order)
}

/** '#Lavoro  extra ' → 'Lavoro extra' */
export function normalizeTag(tag: string) {
  return tag.replace(/^#+/, '').trim().replace(/\s+/g, ' ')
}

export interface CategoryShare {
  categoryId: string
  total: number
  /** Percentuale sul totale del periodo, arrotondata */
  pct: number
  count: number
  /** Ripartizione per tag (movimenti senza tag sotto '') */
  tags: { tag: string; total: number }[]
}

/** Ripartizione per categoria di spese o entrate in un periodo, dalla maggiore. */
export function categoryBreakdown(
  txs: readonly TxLike[],
  type: 'expense' | 'income',
  from: string,
  to: string,
): { total: number; rows: CategoryShare[] } {
  const map = new Map<string, { total: number; count: number; tags: Map<string, number> }>()
  for (const t of alive(txs)) {
    if (t.type !== type || t.date < from || t.date > to) continue
    const k = t.categoryId ?? ''
    const cur = map.get(k) ?? { total: 0, count: 0, tags: new Map() }
    cur.total += t.amount
    cur.count++
    const tag = t.tags[0] ?? ''
    cur.tags.set(tag, (cur.tags.get(tag) ?? 0) + t.amount)
    map.set(k, cur)
  }
  const total = round2([...map.values()].reduce((s, v) => s + v.total, 0))
  const rows = [...map.entries()]
    .map(([categoryId, v]) => ({
      categoryId,
      total: round2(v.total),
      pct: total ? Math.round((v.total / total) * 100) : 0,
      count: v.count,
      tags: [...v.tags.entries()].map(([tag, t]) => ({ tag, total: round2(t) })).sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total)
  return { total, rows }
}

/**
 * Colore fisso per categoria: le 7 categorie con più movimenti in assoluto (per tipo)
 * ricevono uno slot della palette, le altre restano neutre (-1). Il colore segue la
 * categoria, non la sua posizione nel mese visualizzato.
 */
export function categoryColorSlots(txs: readonly TxLike[], slots = 7): Map<string, number> {
  const out = new Map<string, number>()
  for (const type of ['expense', 'income'] as const) {
    const totals = totalsBy(txs, type, 'category', '0000-01-01', '9999-12-31')
    totals.forEach((t, i) => out.set(t.key, i < slots ? i : -1))
  }
  return out
}

export interface PeriodPoint {
  start: string
  income: number
  expense: number
  /** Guadagno (positivo) o perdita (negativo) */
  net: number
}

/** Entrate, spese e guadagno per ciascun periodo; `startOf` mappa una data al suo periodo. */
export function periodSeries(
  txs: readonly TxLike[],
  starts: readonly string[],
  startOf: (date: string) => string,
): PeriodPoint[] {
  const map = new Map(starts.map((s) => [s, { income: 0, expense: 0 }]))
  for (const t of alive(txs)) {
    const cur = map.get(startOf(t.date))
    if (cur) cur[t.type] += t.amount
  }
  return starts.map((start) => {
    const { income, expense } = map.get(start)!
    return { start, income: round2(income), expense: round2(expense), net: round2(income - expense) }
  })
}
