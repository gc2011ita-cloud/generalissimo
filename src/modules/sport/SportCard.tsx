import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Card } from '../../components/ui'
import { getSettings } from '../../db/settings'
import { toISODate } from '../../lib/dates'
import { addMonths, monthLabel } from '../../lib/format'
import { rangeFor } from '../../lib/periods'
import { isPaused } from '../goals/calc'
import { countBetween, monthWeeks } from './calc'
import { setSport, useSportDays } from './queries'

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

/** "Oggi hai fatto sport?" e calendario del mese con il conteggio per settimana. */
export function SportCard() {
  const today = toISODate(new Date())
  const [month, setMonth] = useState(today.slice(0, 7))
  const sport = useSportDays()
  const settings = useLiveQuery(() => getSettings())
  if (!sport || !settings) return null

  const todayAnswer = sport.answers.get(today)
  const doneToday = sport.days.has(today)
  const target = settings.sportWeeklyTarget
  const week = rangeFor('week', today)
  const thisWeek = countBetween(sport.days, week.from, week.to)
  const monthCount = countBetween(sport.days, `${month}-01`, `${month}-31`)

  // Tocco su un giorno: vuoto → sì → no → vuoto
  const cycle = (date: string) => {
    const cur = sport.answers.get(date)
    void setSport(date, cur === undefined ? true : cur ? false : undefined)
  }

  const btn = (v: boolean, label: string) => {
    const on = v ? doneToday && todayAnswer !== false : todayAnswer === false
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setSport(today, on ? undefined : v)}
        className={`h-14 flex-1 rounded-2xl text-lg font-bold ${on ? (v ? 'bg-emerald-600 text-white' : 'bg-ox-900 text-cream dark:bg-cream/80 dark:text-ox-950') : 'bg-ox-900/8 dark:bg-cream/10'}`}
      >
        {label}
      </button>
    )
  }

  return (
    <>
      <Card>
        <h2 className="mb-3 text-lg font-bold">Oggi hai fatto sport?</h2>
        <div className="flex gap-3">
          {btn(true, 'Sì')}
          {btn(false, 'No')}
        </div>
        <p className="mt-3 text-sm opacity-70">
          Questa settimana: <strong>{thisWeek}</strong>
          {target ? ` su ${target}` : ''} {thisWeek === 1 ? 'giorno' : 'giorni'}
        </p>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <button type="button" aria-label="Mese precedente" className="h-10 w-10 text-2xl" onClick={() => setMonth(addMonths(month, -1))}>‹</button>
          <span className="font-semibold capitalize">{monthLabel(month)}</span>
          <button type="button" aria-label="Mese successivo" className="h-10 w-10 text-2xl" onClick={() => setMonth(addMonths(month, 1))}>›</button>
        </div>
        <div className="grid grid-cols-[repeat(7,1fr)_2.5rem] gap-1 text-center text-xs opacity-60">
          {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
          <span>sett.</span>
        </div>
        {monthWeeks(month).map((w) => {
          const n = countBetween(sport.days, w[0].date, w[6].date)
          return (
            <div key={w[0].date} className="mt-1 grid grid-cols-[repeat(7,1fr)_2.5rem] items-center gap-1 text-center">
              {w.map((d) => {
                const yes = sport.days.has(d.date)
                const no = sport.answers.get(d.date) === false
                const future = d.date > today
                const paused = isPaused(d.date, settings.pauses)
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={future || !d.inMonth}
                    onClick={() => cycle(d.date)}
                    aria-label={`${d.date}: ${yes ? 'sport' : no ? 'niente sport' : 'non indicato'}${paused ? ', in pausa' : ''}`}
                    className={`flex h-10 items-center justify-center rounded-full text-sm tabular-nums ${!d.inMonth ? 'opacity-0' : ''} ${
                      yes ? 'bg-emerald-600 font-semibold text-white' : no ? 'bg-ox-900/10 line-through opacity-60 dark:bg-cream/10' : future ? 'opacity-30' : ''
                    } ${d.date === today ? 'ring-2 ring-ochre' : ''} ${paused && !yes ? 'italic opacity-40' : ''}`}
                  >
                    {Number(d.date.slice(8))}
                  </button>
                )
              })}
              <span className={`text-sm font-bold tabular-nums ${target && n >= target ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>{n}</span>
            </div>
          )
        })}
        <p className="mt-3 text-sm opacity-70">
          {monthLabel(month)}: <strong>{monthCount}</strong> {monthCount === 1 ? 'giorno' : 'giorni'} di sport · tocca un giorno per segnarlo
        </p>
      </Card>
    </>
  )
}
