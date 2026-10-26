import { describe, expect, it } from 'vitest'
import { areaOf, groupByArea } from './areas'

describe('aree', () => {
  it('gruppo muscolare → area', () => {
    expect(areaOf('Dorso')).toBe('Schiena')
    expect(areaOf('Femorali')).toBe('Gambe')
    expect(areaOf('Tricipiti')).toBe('Braccia')
    expect(areaOf('Avambracci')).toBe('Altro')
  })
  it('raggruppa in ordine fisso, senza aree vuote', () => {
    const ex = [{ n: 'Squat', m: 'Quadricipiti' }, { n: 'Panca', m: 'Petto' }, { n: 'Stacco', m: 'Dorso' }, { n: 'Leg curl', m: 'Femorali' }]
    expect(groupByArea(ex, (e) => e.m).map(([a, l]) => [a, l.map((e) => e.n)])).toEqual([
      ['Pettorali', ['Panca']],
      ['Schiena', ['Stacco']],
      ['Gambe', ['Squat', 'Leg curl']],
    ])
  })
})
