import { describe, expect, it } from 'vitest'
import { latestByHolding, portfolioSeries, portfolioSummary, type ValueLike } from './calc'

const v = (holdingId: string, date: string, invested: number, value: number, updatedAt = `${date}T10:00:00Z`): ValueLike => ({
  holdingId, date, invested, value, updatedAt, deletedAt: null,
})

describe('investimenti', () => {
  const values = [
    v('etf', '2026-01-10', 5000, 5000),
    v('etf', '2026-03-10', 6000, 6400),
    v('btp', '2026-02-01', 2000, 2010),
    v('etf', '2026-03-10', 6000, 6500, '2026-03-10T18:00:00Z'), // correzione nello stesso giorno
    { ...v('btp', '2026-04-01', 2000, 9999), deletedAt: '2026-04-02T00:00:00Z' },
  ]

  it('ultimo valore per posizione, anche a una data', () => {
    expect(latestByHolding(values).get('etf')?.value).toBe(6500)
    expect(latestByHolding(values, '2026-02-15').get('etf')?.value).toBe(5000)
    expect(latestByHolding(values).get('btp')?.value).toBe(2010)
  })

  it('riepilogo con guadagno e rendimento', () => {
    const s = portfolioSummary(['etf', 'btp'], values)
    expect(s).toMatchObject({ invested: 8000, value: 8510, gain: 510, gainPct: 6.38 })
    expect(s.rows[0]).toMatchObject({ holdingId: 'etf', gain: 500, gainPct: 8.33, closed: false })
  })

  it('le posizioni eliminate non contano', () => {
    expect(portfolioSummary(['etf'], values).value).toBe(6500)
  })

  it('andamento nel tempo con l’ultimo valore noto', () => {
    expect(portfolioSeries(['etf', 'btp'], values)).toEqual([
      { date: '2026-01-10', invested: 5000, value: 5000, gain: 0 },
      { date: '2026-02-01', invested: 7000, value: 7010, gain: 10 },
      { date: '2026-03-10', invested: 8000, value: 8510, gain: 510 },
    ])
  })

  it('posizione chiusa', () => {
    const s = portfolioSummary(['x'], [v('x', '2026-01-01', 100, 120), v('x', '2026-05-01', 0, 0)])
    expect(s.rows[0].closed).toBe(true)
    expect(s.value).toBe(0)
  })
})
