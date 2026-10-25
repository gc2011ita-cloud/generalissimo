import { describe, expect, it } from 'vitest'
import { averageBy, checkInDate, heatmapGrid, prefillAnswers, questionId, scoreLevel } from './calc'
import { DEFAULT_CHECKIN_QUESTIONS } from '../../db/settings'

describe('diario', () => {
  it('precompila "allenato" se c’è un allenamento, senza sovrascrivere le risposte salvate', () => {
    const a = prefillAnswers(DEFAULT_CHECKIN_QUESTIONS, undefined, { workout: true, study: false })
    expect(a.trained).toBe(true)
    expect(a.studied).toBeUndefined()
    const b = prefillAnswers(DEFAULT_CHECKIN_QUESTIONS, { trained: false }, { workout: true, study: false })
    expect(b.trained).toBe(false)
  })

  it('id delle nuove domande', () => {
    expect(questionId('Ho letto?', [])).toBe('ho-letto')
    expect(questionId('Ho letto?', ['ho-letto'])).toBe('ho-letto-2')
    expect(questionId('Città è', [])).toBe('citta-e')
  })

  it('mappa di calore: colonne da lunedì, giorni futuri esclusi', () => {
    const grid = heatmapGrid(new Map([['2026-10-21', 8]]), '2026-10-21', 2)
    expect(grid).toHaveLength(2)
    expect(grid[0][0].date).toBe('2026-10-12') // lunedì della settimana precedente
    expect(grid[1][2]).toEqual({ date: '2026-10-21', score: 8, inRange: true })
    expect(grid[1][3].inRange).toBe(false)
  })

  it('medie settimanali e mensili', () => {
    const e = [
      { date: '2026-10-19', overallScore: 6 },
      { date: '2026-10-20', overallScore: 8 },
      { date: '2026-10-26', overallScore: 9 },
      { date: '2026-10-27', overallScore: null },
    ]
    expect(averageBy(e, 'week')).toEqual([
      { period: '2026-W43', average: 7, days: 2 },
      { period: '2026-W44', average: 9, days: 1 },
    ])
    expect(averageBy(e, 'month')).toEqual([{ period: '2026-10', average: 7.67, days: 3 }])
  })

  it('livelli di colore e data del check-in', () => {
    expect([null, 3, 5, 7, 10].map(scoreLevel)).toEqual([0, 1, 2, 3, 4])
    expect(checkInDate(new Date(2026, 9, 22, 1, 30))).toBe('2026-10-21')
    expect(checkInDate(new Date(2026, 9, 22, 22, 0))).toBe('2026-10-22')
  })
})
