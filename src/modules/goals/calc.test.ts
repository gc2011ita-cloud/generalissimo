import { describe, expect, it } from 'vitest'
import { activeDays, budgetStatus, elapsedFraction, progressStatus } from './calc'

const th = { onTrack: 0.9, behind: 0.7, staleDays: 7 }
const pause = { id: 'p', from: '2026-11-10', to: '2026-11-19', reason: 'vacation' as const }

describe('obiettivi', () => {
  it('giorni attivi e frazione trascorsa, senza le pause', () => {
    expect(activeDays('2026-11-01', '2026-11-30', [])).toBe(30)
    expect(activeDays('2026-11-01', '2026-11-30', [pause])).toBe(20)
    expect(elapsedFraction('2026-11-01', '2026-11-30', '2026-11-15', [])).toBe(0.5)
    expect(elapsedFraction('2026-11-01', '2026-11-30', '2026-11-15', [pause])).toBe(0.45) // 9 su 20
    expect(elapsedFraction('2026-11-01', '2026-11-30', '2026-10-01')).toBe(0)
    expect(elapsedFraction('2026-11-01', '2026-11-30', '2026-12-05')).toBe(1)
  })

  it('stato con le soglie 90% / 70%', () => {
    const base = { target: 100, fraction: 0.5, closed: false, thresholds: th }
    expect(progressStatus({ ...base, current: 100 })).toBe('achieved')
    expect(progressStatus({ ...base, current: 45 })).toBe('onTrack')
    expect(progressStatus({ ...base, current: 40 })).toBe('behind')
    expect(progressStatus({ ...base, current: 30 })).toBe('atRisk')
    expect(progressStatus({ ...base, current: 50, closed: true })).toBe('missed')
    expect(progressStatus({ ...base, current: 50, daysSinceUpdate: 9 })).toBe('stale')
    expect(progressStatus({ ...base, current: 0, fraction: 0 })).toBe('onTrack')
  })

  it('budget: proiezione e sforamento', () => {
    expect(budgetStatus(200, 600, 0.5, false)).toBe('onTrack')
    expect(budgetStatus(350, 600, 0.5, false)).toBe('behind') // proiezione 700
    expect(budgetStatus(650, 600, 0.5, false)).toBe('atRisk')
    expect(budgetStatus(500, 600, 1, true)).toBe('achieved')
    expect(budgetStatus(650, 600, 1, true)).toBe('missed')
  })
})

import { effectiveStart } from './calc'

describe('obiettivo aggiunto a metà mese', () => {
  it('si misura dal giorno di creazione', () => {
    expect(effectiveStart('2026-10-01', '2026-10-26T09:00:00Z')).toBe('2026-10-26')
    expect(effectiveStart('2026-11-01', '2026-10-30T09:00:00Z')).toBe('2026-11-01')
    expect(elapsedFraction(effectiveStart('2026-10-01', '2026-10-26T09:00:00Z'), '2026-10-31', '2026-10-26')).toBeCloseTo(1 / 6)
  })
})
