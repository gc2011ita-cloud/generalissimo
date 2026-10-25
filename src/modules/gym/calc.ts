// Calcoli della palestra (funzioni pure).

import { isoWeekKey } from '../../lib/dates'
import { round2 } from '../../lib/format'

export interface SetLike {
  workoutId: string
  exerciseId: string
  order: number
  weight: number | null
  reps: number | null
  isWarmup: boolean
  deletedAt: string | null
}

export interface WorkoutLike {
  id: string
  date: string
  createdAt: string
  deletedAt: string | null
}

/** 1RM stimato con la formula di Epley: peso × (1 + ripetizioni / 30). Con 1 ripetizione è il peso stesso. */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return round2(weight * (1 + reps / 30))
}

const workingSets = <S extends SetLike>(sets: readonly S[]) =>
  sets.filter((s) => s.deletedAt === null && !s.isWarmup && (s.weight ?? 0) > 0 && (s.reps ?? 0) > 0)

/** Allenamenti in ordine cronologico (data, poi ora di creazione). */
export function sortWorkouts<W extends WorkoutLike>(workouts: readonly W[]): W[] {
  return workouts
    .filter((w) => w.deletedAt === null)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
}

export interface ExerciseSessionStats {
  workoutId: string
  date: string
  maxWeight: number
  best1RM: number
  volume: number
  /** Nuovo record di 1RM stimato rispetto a tutte le sessioni precedenti */
  isPR: boolean
}

/** Storico di un esercizio, una riga per sessione, con i record personali evidenziati. */
export function exerciseHistory(
  exerciseId: string,
  sets: readonly SetLike[],
  workouts: readonly WorkoutLike[],
): ExerciseSessionStats[] {
  const mine = workingSets(sets).filter((s) => s.exerciseId === exerciseId)
  const out: ExerciseSessionStats[] = []
  let record = 0
  for (const w of sortWorkouts(workouts)) {
    const ws = mine.filter((s) => s.workoutId === w.id)
    if (!ws.length) continue
    const maxWeight = Math.max(...ws.map((s) => s.weight!))
    const best1RM = Math.max(...ws.map((s) => epley1RM(s.weight!, s.reps!)))
    const volume = round2(ws.reduce((v, s) => v + s.weight! * s.reps!, 0))
    const isPR = best1RM > record
    if (isPR) record = best1RM
    out.push({ workoutId: w.id, date: w.date, maxWeight, best1RM, volume, isPR })
  }
  return out
}

/** Volume (kg × ripetizioni, senza riscaldamento) per settimana ISO e gruppo muscolare. */
export function weeklyVolumeByMuscle(
  sets: readonly SetLike[],
  workouts: readonly WorkoutLike[],
  muscleOf: (exerciseId: string) => string | undefined,
): { week: string; muscle: string; volume: number }[] {
  const dateOf = new Map(workouts.filter((w) => w.deletedAt === null).map((w) => [w.id, w.date]))
  const map = new Map<string, number>()
  for (const s of workingSets(sets)) {
    const date = dateOf.get(s.workoutId)
    const muscle = muscleOf(s.exerciseId)
    if (!date || !muscle) continue
    const key = `${isoWeekKey(date)}|${muscle}`
    map.set(key, (map.get(key) ?? 0) + s.weight! * s.reps!)
  }
  return [...map.entries()]
    .map(([k, volume]) => {
      const [week, muscle] = k.split('|')
      return { week, muscle, volume: round2(volume) }
    })
    .sort((a, b) => a.week.localeCompare(b.week) || a.muscle.localeCompare(b.muscle))
}

/** Serie della sessione precedente per un esercizio, escluso l'allenamento corrente. */
export function previousSets<S extends SetLike>(
  exerciseId: string,
  sets: readonly S[],
  workouts: readonly WorkoutLike[],
  excludeWorkoutId?: string,
): S[] {
  const ordered = sortWorkouts(workouts).filter((w) => w.id !== excludeWorkoutId)
  for (let i = ordered.length - 1; i >= 0; i--) {
    const found = sets
      .filter((s) => s.deletedAt === null && s.workoutId === ordered[i].id && s.exerciseId === exerciseId)
      .sort((a, b) => a.order - b.order)
    if (found.length) return found
  }
  return []
}

/**
 * Progressione suggerita: se nella sessione precedente tutte le serie di lavoro hanno
 * raggiunto le ripetizioni previste, propone il carico più alto + incremento.
 */
export function suggestWeight(prev: readonly SetLike[], targetReps: number, incrementKg: number) {
  const ws = workingSets(prev)
  if (!ws.length) return null
  const top = Math.max(...ws.map((s) => s.weight!))
  const allDone = ws.every((s) => s.reps! >= targetReps)
  return { weight: allDone ? round2(top + incrementKg) : top, increased: allDone }
}
