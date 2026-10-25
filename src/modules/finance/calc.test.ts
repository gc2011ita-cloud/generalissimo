import { describe, expect, it } from 'vitest'
import { accountBalance, categoriesByRecentUse, monthlySummaries, normalizeTag, sumBetween, tagUsage, totalsBy, type TxLike } from './calc'

const tx = (date: string, amount: number, type: TxLike['type'], extra: Partial<TxLike> = {}): TxLike => ({
  date, amount, type, categoryId: 'c1', accountId: 'a1', tags: [], deletedAt: null, ...extra,
})

describe('finanze', () => {
  const txs = [
    tx('2026-08-05', 1000, 'income'),
    tx('2026-08-10', 300.1, 'expense'),
    tx('2026-10-01', 200, 'expense', { categoryId: 'c2' }),
    tx('2026-10-02', 50, 'expense', { deletedAt: '2026-10-03T00:00:00Z' }),
  ]

  it('risparmio del mese e cumulato, senza buchi tra i mesi', () => {
    expect(monthlySummaries(txs)).toEqual([
      { month: '2026-08', income: 1000, expense: 300.1, net: 699.9, cumulative: 699.9 },
      { month: '2026-09', income: 0, expense: 0, net: 0, cumulative: 699.9 },
      { month: '2026-10', income: 0, expense: 200, net: -200, cumulative: 499.9 },
    ])
    expect(monthlySummaries([])).toEqual([])
  })

  it('saldo del conto, anche a una data', () => {
    expect(accountBalance(100, 'a1', txs)).toBe(599.9)
    expect(accountBalance(100, 'a1', txs, '2026-08-31')).toBe(799.9)
    expect(accountBalance(100, 'altro', txs)).toBe(100)
  })

  it('totali per categoria e per tag, esclusi i cancellati', () => {
    expect(totalsBy(txs, 'expense', 'category', '2026-01-01', '2026-12-31')).toEqual([
      { key: 'c1', total: 300.1 },
      { key: 'c2', total: 200 },
    ])
    const tagged = [tx('2026-01-01', 10, 'income', { tags: ['Fisso', 'Extra'] }), tx('2026-01-02', 5, 'income', { tags: ['Fisso'] })]
    expect(totalsBy(tagged, 'income', 'tag', '2026-01-01', '2026-01-31')).toEqual([
      { key: 'Fisso', total: 15 },
      { key: 'Extra', total: 10 },
    ])
    expect(tagUsage(tagged)).toEqual(['Fisso', 'Extra'])
    expect(sumBetween(txs, 'expense', '2026-10-01', '2026-10-31')).toBe(200)
  })

  it('categorie più usate in cima', () => {
    const cats = [{ id: 'a', order: 0 }, { id: 'b', order: 1 }, { id: 'c', order: 2 }]
    const recent = [{ categoryId: 'c' }, { categoryId: 'c' }, { categoryId: 'b' }]
    expect(categoriesByRecentUse(cats, recent).map((c) => c.id)).toEqual(['c', 'b', 'a'])
  })

  it('normalizza i tag', () => {
    expect(normalizeTag('#Lavoro  extra ')).toBe('Lavoro extra')
  })
})

import { categoryBreakdown, categoryColorSlots, periodSeries } from './calc'

describe('home e grafici', () => {
  const t = (date: string, amount: number, type: TxLike['type'], categoryId: string, tags: string[] = []): TxLike => ({
    date, amount, type, categoryId, accountId: 'a', tags, deletedAt: null,
  })
  const txs = [
    t('2026-10-01', 300, 'expense', 'casa'),
    t('2026-10-02', 100, 'expense', 'bar'),
    t('2026-10-03', 100, 'expense', 'bar'),
    t('2026-10-05', 1000, 'income', 'stip', ['Fisso']),
    t('2026-10-06', 500, 'income', 'stip', ['Extra']),
    t('2026-09-10', 50, 'expense', 'altro'),
  ]

  it('ripartizione per categoria con percentuali e tag', () => {
    const b = categoryBreakdown(txs, 'expense', '2026-10-01', '2026-10-31')
    expect(b.total).toBe(500)
    expect(b.rows.map((r) => [r.categoryId, r.total, r.pct, r.count])).toEqual([
      ['casa', 300, 60, 1],
      ['bar', 200, 40, 2],
    ])
    const inc = categoryBreakdown(txs, 'income', '2026-10-01', '2026-10-31')
    expect(inc.rows[0].tags).toEqual([{ tag: 'Fisso', total: 1000 }, { tag: 'Extra', total: 500 }])
  })

  it('colori fissi per categoria, le meno usate neutre', () => {
    const slots = categoryColorSlots(txs, 2)
    expect(slots.get('casa')).toBe(0)
    expect(slots.get('bar')).toBe(1)
    expect(slots.get('altro')).toBe(-1)
    expect(slots.get('stip')).toBe(0)
  })

  it('serie per periodo con guadagni e perdite', () => {
    const s = periodSeries(txs, ['2026-09-01', '2026-10-01'], (d) => `${d.slice(0, 7)}-01`)
    expect(s).toEqual([
      { start: '2026-09-01', income: 0, expense: 50, net: -50 },
      { start: '2026-10-01', income: 1500, expense: 500, net: 1000 },
    ])
  })
})
