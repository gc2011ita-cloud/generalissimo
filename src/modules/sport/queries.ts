import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { createRecord, updateRecord } from '../../db/repo'
import { sportDaySet } from './calc'

/** La risposta "sport sì/no" è la domanda 'trained' del diario del giorno. */
export const SPORT_KEY = 'trained'

export function useSportDays() {
  return useLiveQuery(async () => {
    const [logs, workouts] = await Promise.all([db.dayLogs.toArray(), db.workouts.toArray()])
    const alive = logs.filter((l) => l.deletedAt === null)
    const answers = alive.map((l) => ({ date: l.date, trained: l.answers?.[SPORT_KEY] as boolean | undefined }))
    const days = sportDaySet(answers, workouts.filter((w) => w.deletedAt === null).map((w) => w.date))
    return { days, answers: new Map(answers.map((a) => [a.date, a.trained])) }
  })
}

/** Imposta (o toglie, con undefined) la risposta di un giorno. */
export async function setSport(date: string, value: boolean | undefined) {
  const log = await db.dayLogs.where('date').equals(date).first()
  if (log) {
    const answers = { ...log.answers }
    if (value === undefined) delete answers[SPORT_KEY]
    else answers[SPORT_KEY] = value
    await updateRecord(db.dayLogs, log.id, { answers, ...(log.deletedAt ? { deletedAt: null } : {}) } as never)
  } else if (value !== undefined) {
    await createRecord(db.dayLogs, {
      date, overallScore: null, satisfaction: null, tiredness: null, answers: { [SPORT_KEY]: value },
      bedtime: null, wakeTime: null, improve: '', note: '',
    })
  }
}
