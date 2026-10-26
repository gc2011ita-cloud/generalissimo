import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { createRecord } from '../../db/repo'
import type { Goal, GoalUpdate } from '../../db/schema'
import { rangeFor } from '../../lib/periods'

/** Gli obiettivi di studio sono obiettivi manuali mensili in percentuale, marcati 'study'. */
export const STUDY_FILTER = 'study'

export interface StudyGoal {
  goal: Goal
  updates: GoalUpdate[] // dal più recente
  progress: number // 0–100
}

export function useStudyGoals() {
  return useLiveQuery(async () => {
    const [goals, updates] = await Promise.all([db.goals.toArray(), db.goalUpdates.toArray()])
    return goals
      .filter((g) => g.deletedAt === null && g.sourceFilter === STUDY_FILTER)
      .map((goal): StudyGoal => {
        const u = updates
          .filter((x) => x.deletedAt === null && x.goalId === goal.id)
          .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
        return { goal, updates: u, progress: u[0]?.value ?? 0 }
      })
  })
}

export async function createStudyGoal(title: string, month: string) {
  const r = rangeFor('month', `${month}-01`)
  return createRecord(db.goals, {
    title,
    kind: 'manual',
    source: 'manual',
    phase: 'active',
    sourceFilter: STUDY_FILTER,
    target: 100,
    direction: 'atLeast',
    periodType: 'month',
    periodStart: r.from,
    periodEnd: r.to,
    autoRenew: false,
    status: null,
    archived: false,
  })
}
