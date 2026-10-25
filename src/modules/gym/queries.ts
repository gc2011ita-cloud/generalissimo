import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { createRecord, nowISO, updateRecord } from '../../db/repo'
import type { Exercise } from '../../db/schema'
import { toISODate } from '../../lib/dates'

export function useExercises() {
  return useLiveQuery(async () =>
    (await db.exercises.toArray()).filter((e) => e.deletedAt === null).sort((a, b) => a.name.localeCompare(b.name)),
  )
}

export function useExerciseMap() {
  return useLiveQuery(async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e] as [string, Exercise])))
}

export function useTemplates() {
  return useLiveQuery(async () =>
    (await db.workoutTemplates.toArray()).filter((t) => t.deletedAt === null).sort((a, b) => a.name.localeCompare(b.name)),
  )
}

/** Tutti gli allenamenti e le serie non cancellati (per storico, prefill e record). */
export function useGymData() {
  return useLiveQuery(async () => {
    const [workouts, sets] = await Promise.all([db.workouts.toArray(), db.workoutSets.toArray()])
    const alive = workouts.filter((w) => w.deletedAt === null)
    const ids = new Set(alive.map((w) => w.id))
    return { workouts: alive, sets: sets.filter((s) => s.deletedAt === null && ids.has(s.workoutId)) }
  })
}

export function useActiveSession() {
  return useLiveQuery(async () =>
    (await db.workouts.toArray()).find((w) => w.deletedAt === null && w.type === 'gym' && w.endedAt === null) ?? null,
  )
}

export async function startSession(templateId: string | null) {
  const w = await createRecord(db.workouts, {
    date: toISODate(new Date()),
    templateId,
    type: 'gym',
    duration: null,
    distance: null,
    elevation: null,
    note: '',
    endedAt: null,
  })
  return w.id
}

export async function finishSession(id: string) {
  const w = await db.workouts.get(id)
  if (!w) return
  const minutes = Math.max(1, Math.round((Date.now() - new Date(w.createdAt).getTime()) / 60000))
  await updateRecord(db.workouts, id, { endedAt: nowISO(), duration: w.duration ?? minutes })
}
