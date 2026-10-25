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
