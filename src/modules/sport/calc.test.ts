import { describe, expect, it } from 'vitest'
import { countBetween, monthWeeks, sportDaySet } from './calc'

describe('sport', () => {
  it('la risposta del giorno vince sull’allenamento registrato', () => {
    const s = sportDaySet(
      [{ date: '2026-11-02', trained: true }, { date: '2026-11-03', trained: false }, { date: '2026-11-04', trained: undefined }],
      ['2026-11-03', '2026-11-04', '2026-11-05'],
    )
    expect([...s].sort()).toEqual(['2026-11-02', '2026-11-04', '2026-11-05'])
    expect(countBetween(s, '2026-11-02', '2026-11-04')).toBe(2)
  })

  it('settimane del mese da lunedì', () => {
    const w = monthWeeks('2026-11') // 1 novembre 2026 è domenica
    expect(w[0][0]).toEqual({ date: '2026-10-26', inMonth: false })
    expect(w[0][6]).toEqual({ date: '2026-11-01', inMonth: true })
    expect(w.at(-1)!.at(-1)!.date).toBe('2026-12-06')
    expect(w).toHaveLength(6)
    expect(monthWeeks('2027-02')).toHaveLength(4) // febbraio 2027 parte di lunedì
  })
})
