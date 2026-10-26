import { describe, expect, it } from 'vitest'
import { epley1RM, exerciseHistory, previousSets, suggestWeight, weeklyVolumeByMuscle, type SetLike, type WorkoutLike } from './calc'

const w = (id: string, date: string): WorkoutLike => ({ id, date, createdAt: `${date}T10:00:00Z`, deletedAt: null })
const s = (workoutId: string, exerciseId: string, order: number, weight: number, reps: number, isWarmup = false): SetLike => ({
  workoutId, exerciseId, order, weight, reps, isWarmup, deletedAt: null,
})

describe('palestra', () => {
  it('1RM di Epley', () => {
    expect(epley1RM(100, 1)).toBe(100)
    expect(epley1RM(100, 10)).toBe(133.33)
    expect(epley1RM(0, 5)).toBe(0)
  })

  const workouts = [w('w2', '2026-10-08'), w('w1', '2026-10-01'), w('w3', '2026-10-15')]
  const sets = [
    s('w1', 'panca', 0, 40, 10, true),
    s('w1', 'panca', 1, 80, 8),
    s('w1', 'panca', 2, 80, 8),
    s('w2', 'panca', 0, 82.5, 8),
    s('w2', 'panca', 1, 82.5, 6),
    s('w3', 'panca', 0, 80, 8),
    s('w3', 'squat', 0, 100, 5),
  ]

  it('storico con record personali', () => {
    const h = exerciseHistory('panca', sets, workouts)
    expect(h.map((x) => [x.date, x.maxWeight, x.isPR])).toEqual([
      ['2026-10-01', 80, true],
      ['2026-10-08', 82.5, true],
      ['2026-10-15', 80, false],
    ])
    expect(h[0].volume).toBe(1280) // riscaldamento escluso
  })

  it('volume settimanale per gruppo muscolare', () => {
    const v = weeklyVolumeByMuscle(sets, workouts, (id) => (id === 'panca' ? 'Petto' : 'Quadricipiti'))
    expect(v).toContainEqual({ week: '2026-W42', muscle: 'Quadricipiti', volume: 500 })
    expect(v).toContainEqual({ week: '2026-W40', muscle: 'Petto', volume: 1280 })
  })

  it('serie precedenti, escludendo la sessione corrente', () => {
    expect(previousSets('panca', sets, workouts, 'w3').map((x) => x.weight)).toEqual([82.5, 82.5])
    expect(previousSets('stacco', sets, workouts)).toEqual([])
  })

  it('progressione suggerita', () => {
    expect(suggestWeight([s('w', 'p', 0, 80, 8), s('w', 'p', 1, 80, 8)], 8, 2.5)).toEqual({ weight: 82.5, increased: true })
    expect(suggestWeight([s('w', 'p', 0, 80, 8), s('w', 'p', 1, 80, 6)], 8, 2.5)).toEqual({ weight: 80, increased: false })
    expect(suggestWeight([], 8, 2.5)).toBeNull()
  })
})

import { recordsByExercise } from './calc'

describe('massimali', () => {
  it('per esercizio, dal più recente, esclusi gli eliminati', () => {
    const r = (exerciseId: string, date: string, weight: number, deletedAt: string | null = null) => ({
      exerciseId, date, reps: 5, weight, updatedAt: `${date}T10:00:00Z`, deletedAt,
    })
    const m = recordsByExercise([r('panca', '2026-09-01', 80), r('panca', '2026-10-01', 85), r('panca', '2026-10-15', 90, 'x'), r('squat', '2026-10-01', 120)])
    expect(m.get('panca')!.map((x) => x.weight)).toEqual([85, 80])
    expect(m.get('squat')![0].weight).toBe(120)
  })
})
