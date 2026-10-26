import { describe, expect, it } from 'vitest'
import { occurrences } from './recurring'

describe('spese ricorrenti', () => {
  it('mensile, con il 31 che diventa l’ultimo giorno del mese', () => {
    const r = { frequency: 'monthly' as const, dayOfPeriod: 31, startDate: '2026-01-15', endDate: null }
    expect(occurrences(r, null, '2026-04-10')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
    expect(occurrences(r, '2026-02-28', '2026-04-30')).toEqual(['2026-03-31', '2026-04-30'])
  })
  it('mensile dal giorno di inizio e con data di fine', () => {
    const r = { frequency: 'monthly' as const, dayOfPeriod: 1, startDate: '2026-11-01', endDate: '2027-01-15' }
    expect(occurrences(r, null, '2027-06-01')).toEqual(['2026-11-01', '2026-12-01', '2027-01-01'])
  })
  it('settimanale e annuale', () => {
    expect(occurrences({ frequency: 'weekly', dayOfPeriod: 1, startDate: '2026-11-01', endDate: null }, null, '2026-11-20')).toEqual([
      '2026-11-02', '2026-11-09', '2026-11-16',
    ])
    expect(occurrences({ frequency: 'yearly', dayOfPeriod: 15, startDate: '2026-03-01', endDate: null }, null, '2028-03-14')).toEqual([
      '2026-03-15', '2027-03-15',
    ])
  })
  it('niente doppioni: riparte dopo l’ultima generata', () => {
    const r = { frequency: 'monthly' as const, dayOfPeriod: 5, startDate: '2026-01-01', endDate: null }
    expect(occurrences(r, '2026-03-05', '2026-03-31')).toEqual([])
  })
})
