import { describe, expect, it } from 'vitest'
import { daysBetween, isoWeekKey, toISODate } from './dates'

describe('dates', () => {
  it('toISODate usa la data locale', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('isoWeekKey segue ISO 8601', () => {
    expect(isoWeekKey('2026-10-21')).toBe('2026-W43')
    expect(isoWeekKey('2026-10-19')).toBe('2026-W43') // lunedì
    expect(isoWeekKey('2026-10-25')).toBe('2026-W43') // domenica
    expect(isoWeekKey('2026-10-26')).toBe('2026-W44')
    expect(isoWeekKey('2027-01-01')).toBe('2026-W53') // venerdì: settimana dell'anno prima
    expect(isoWeekKey('2024-12-30')).toBe('2025-W01')
  })

  it('daysBetween conta i giorni di calendario', () => {
    expect(daysBetween(new Date(2026, 9, 20, 23, 0), new Date(2026, 9, 21, 1, 0))).toBe(1)
    expect(daysBetween(new Date(2026, 9, 21, 1, 0), new Date(2026, 9, 21, 23, 0))).toBe(0)
    expect(daysBetween(new Date(2026, 2, 28), new Date(2026, 2, 30))).toBe(2) // cambio ora legale
  })
})
