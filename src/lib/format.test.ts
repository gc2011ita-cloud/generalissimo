import { describe, expect, it } from 'vitest'
import { addMonths, monthLabel, parseDecimal } from './format'

describe('format', () => {
  it('parseDecimal legge i numeri all’italiana', () => {
    expect(parseDecimal('12,50')).toBe(12.5)
    expect(parseDecimal('1.234,56')).toBe(1234.56)
    expect(parseDecimal('1.234')).toBe(1234)
    expect(parseDecimal('12.5')).toBe(12.5)
    expect(parseDecimal(' 7 € ')).toBe(7)
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
  })
  it('mesi', () => {
    expect(monthLabel('2026-10')).toBe('ottobre 2026')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
  })
})
