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
    const tagged = [tx('2026-01-01', 10, 'income', { tags: ['Ssm', 'Mmg'] }), tx('2026-01-02', 5, 'income', { tags: ['Ssm'] })]
    expect(totalsBy(tagged, 'income', 'tag', '2026-01-01', '2026-01-31')).toEqual([
      { key: 'Ssm', total: 15 },
      { key: 'Mmg', total: 10 },
    ])
    expect(tagUsage(tagged)).toEqual(['Ssm', 'Mmg'])
    expect(sumBetween(txs, 'expense', '2026-10-01', '2026-10-31')).toBe(200)
  })

  it('categorie più usate in cima', () => {
    const cats = [{ id: 'a', order: 0 }, { id: 'b', order: 1 }, { id: 'c', order: 2 }]
    const recent = [{ categoryId: 'c' }, { categoryId: 'c' }, { categoryId: 'b' }]
    expect(categoriesByRecentUse(cats, recent).map((c) => c.id)).toEqual(['c', 'b', 'a'])
  })

  it('normalizza i tag', () => {
    expect(normalizeTag('#Guardie  mediche ')).toBe('Guardie mediche')
  })
})
