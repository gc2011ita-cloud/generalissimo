import { describe, expect, it } from 'vitest'
import { periodStarts, rangeFor, rangeLabel, shiftAnchor } from './periods'

describe('periodi', () => {
  it('intervalli', () => {
    expect(rangeFor('day', '2026-10-21')).toEqual({ from: '2026-10-21', to: '2026-10-21' })
    expect(rangeFor('week', '2026-10-21')).toEqual({ from: '2026-10-19', to: '2026-10-25' })
    expect(rangeFor('week', '2026-10-25')).toEqual({ from: '2026-10-19', to: '2026-10-25' })
    expect(rangeFor('month', '2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(rangeFor('year', '2026-10-21')).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })
  it('spostamenti', () => {
    expect(shiftAnchor('month', '2026-01-31', -1)).toBe('2025-12-01')
    expect(shiftAnchor('week', '2026-10-21', 1)).toBe('2026-10-28')
    expect(shiftAnchor('year', '2026-10-21', -2)).toBe('2024-01-01')
  })
  it('etichette', () => {
    expect(rangeLabel('month', rangeFor('month', '2026-10-21'))).toBe('ottobre 2026')
    expect(rangeLabel('year', rangeFor('year', '2026-10-21'))).toBe('2026')
    expect(rangeLabel('week', rangeFor('week', '2026-10-21'))).toBe('19 ott – 25 ott 2026')
  })
  it('inizi dei periodi', () => {
    expect(periodStarts('month', '2026-08-15', '2026-10-02')).toEqual(['2026-08-01', '2026-09-01', '2026-10-01'])
    expect(periodStarts('week', '2026-10-21', '2026-11-02')).toEqual(['2026-10-19', '2026-10-26', '2026-11-02'])
  })
})
