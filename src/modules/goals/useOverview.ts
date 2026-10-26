import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { getSettings } from '../../db/settings'
import type { GoalStatus } from '../../db/schema'
import { daysBetween, toISODate } from '../../lib/dates'
import { rangeFor } from '../../lib/periods'
import { countBetween, sportDaySet } from '../sport/calc'
import { SPORT_KEY } from '../sport/queries'
import { STUDY_FILTER } from '../study/queries'
import { NEEDS_ATTENTION, activeDays, effectiveStart, elapsedFraction, isPaused, progressStatus } from './calc'

/** Riepilogo degli obiettivi: studio del mese e sport della settimana. */
export function useGoalsOverview() {
  return useLiveQuery(async () => {
    const today = toISODate(new Date())
    const month = rangeFor('month', today)
    const week = rangeFor('week', today)
    const [settings, goals, updates, logs, workouts] = await Promise.all([
      getSettings(),
      db.goals.toArray(),
      db.goalUpdates.toArray(),
      db.dayLogs.toArray(),
      db.workouts.toArray(),
    ])
    const { pauses, goalThresholds: thresholds } = settings
    const paused = pauses.find((p) => today >= p.from && today <= p.to) ?? null

    const study = goals
      .filter((g) => g.deletedAt === null && g.sourceFilter === STUDY_FILTER && g.periodStart === month.from)
      .map((g) => {
        const u = updates.filter((x) => x.deletedAt === null && x.goalId === g.id).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
        const progress = u[0]?.value ?? 0
        const status: GoalStatus = progressStatus({
          current: progress,
          target: 100,
          fraction: elapsedFraction(effectiveStart(month.from, g.createdAt), month.to, today, pauses),
          closed: false,
          thresholds,
          daysSinceUpdate: daysBetween(new Date(u[0]?.date ?? g.createdAt.slice(0, 10)), new Date()),
        })
        return { id: g.id, title: g.title, progress, status }
      })

    const days = sportDaySet(
      logs.filter((l) => l.deletedAt === null).map((l) => ({ date: l.date, trained: l.answers?.[SPORT_KEY] as boolean | undefined })),
      workouts.filter((w) => w.deletedAt === null).map((w) => w.date),
    )
    const weekCount = countBetween(days, week.from, week.to)
    const target = settings.sportWeeklyTarget
    // Con le pause l'obiettivo settimanale si riduce in proporzione ai giorni attivi.
    const weekTarget = target ? Math.round((target * activeDays(week.from, week.to, pauses)) / 7) : null
    const sport = {
      week: weekCount,
      month: countBetween(days, month.from, month.to),
      target: weekTarget,
      status: weekTarget
        ? progressStatus({ current: weekCount, target: weekTarget, fraction: elapsedFraction(week.from, week.to, today, pauses), closed: false, thresholds })
        : null,
    }


    // In pausa (vacanza, trasferta, malattia) gli avvisi tacciono.
    const statuses = paused ? [] : [...study.map((s) => s.status), ...(sport.status ? [sport.status] : [])]
    const attention = statuses.filter((s) => NEEDS_ATTENTION.includes(s)).length
    return { study, sport, attention, paused, pauses, isPausedToday: isPaused(today, pauses), sportTarget: target }
  })
}
