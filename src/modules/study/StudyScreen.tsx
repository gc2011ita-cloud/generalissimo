import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { BackButton, Banner, Button, Card, Field, List, ListRow, Screen, Sheet, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord, softDelete, undoDelete, updateRecord } from '../../db/repo'
import { getSettings } from '../../db/settings'
import { daysBetween, toISODate } from '../../lib/dates'
import { addMonths, dayLabel, monthLabel } from '../../lib/format'
import { showToast } from '../../lib/toast'
import { effectiveStart, elapsedFraction, progressStatus } from '../goals/calc'
import { StatusPill } from '../goals/labels'
import { createStudyGoal, useStudyGoals, type StudyGoal } from './queries'

export function useStudyStatus() {
  const settings = useLiveQuery(() => getSettings())
  const today = toISODate(new Date())
  return (g: StudyGoal) => {
    const lastDate = g.updates[0]?.date ?? g.goal.createdAt.slice(0, 10)
    return progressStatus({
      current: g.progress,
      target: 100,
      fraction: elapsedFraction(effectiveStart(g.goal.periodStart, g.goal.createdAt), g.goal.periodEnd, today, settings?.pauses ?? []),
      closed: today > g.goal.periodEnd,
      thresholds: settings?.goalThresholds ?? { onTrack: 0.9, behind: 0.7, staleDays: 7 },
      daysSinceUpdate: daysBetween(new Date(lastDate), new Date()),
    })
  }
}

/** Obiettivi di studio del mese: li fissi a inizio mese e aggiorni come procedi. */
export function StudyScreen() {
  const today = toISODate(new Date())
  const current = today.slice(0, 7)
  const [month, setMonth] = useState(current)
  const all = useStudyGoals()
  const statusOf = useStudyStatus()
  const [open, setOpen] = useState<StudyGoal | 'new' | null>(null)
  if (!all) return null

  const ofMonth = (m: string) => all.filter((g) => g.goal.periodStart.startsWith(m))
  const goals = ofMonth(month)
  const prev = addMonths(month, -1)
  const unfinishedPrev = ofMonth(prev).filter((g) => g.progress < 100)

  const carryOver = async () => {
    for (const g of unfinishedPrev) await createStudyGoal(g.goal.title, month)
    showToast(`${unfinishedPrev.length} obiettivi ripresi da ${monthLabel(prev)}`)
  }

  return (
    <Screen title="Studio" back={<BackButton to="/more" label="Altro" />}>
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Mese precedente" className="h-11 w-11 text-2xl" onClick={() => setMonth(addMonths(month, -1))}>‹</button>
        <span className="text-lg font-semibold capitalize">{monthLabel(month)}</span>
        <button type="button" aria-label="Mese successivo" className="h-11 w-11 text-2xl" onClick={() => setMonth(addMonths(month, 1))}>›</button>
      </div>

      {goals.length === 0 && month >= current && (
        <Banner>
          <p className="font-semibold">Imposta i target di {monthLabel(month)}</p>
          <p className="mt-1 text-sm">Scrivi cosa vuoi studiare questo mese; durante il mese aggiorni a che punto sei.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setOpen('new')}>Nuovo obiettivo</Button>
            {unfinishedPrev.length > 0 && <Button onClick={carryOver}>Riprendi i {unfinishedPrev.length} non completati</Button>}
          </div>
        </Banner>
      )}

      {goals.map((g) => {
        const status = statusOf(g)
        return (
          <Card key={g.goal.id}>
            <button type="button" className="w-full text-left" onClick={() => setOpen(g)}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{g.goal.title}</h2>
                <StatusPill status={status} />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2.5 flex-1 rounded-full bg-ox-900/8 dark:bg-cream/10">
                  <div className="h-2.5 rounded-full bg-emerald-600" style={{ width: `${g.progress}%` }} />
                </div>
                <span className="w-12 text-right font-bold tabular-nums">{g.progress}%</span>
              </div>
              {g.updates[0]?.note && <p className="mt-2 text-sm opacity-70">“{g.updates[0].note}” · {dayLabel(g.updates[0].date)}</p>}
            </button>
          </Card>
        )
      })}

      {goals.length > 0 && <Button onClick={() => setOpen('new')}>+ Obiettivo di {monthLabel(month)}</Button>}

      {open === 'new' && <NewGoalSheet month={month} onClose={() => setOpen(null)} />}
      {open && open !== 'new' && <GoalSheet g={open} onClose={() => setOpen(null)} />}
    </Screen>
  )
}

function NewGoalSheet({ month, onClose }: { month: string; onClose: () => void }) {
  const [title, setTitle] = useState('')
  return (
    <Sheet title={`Obiettivo di ${monthLabel(month)}`} onClose={onClose}>
      <Field label="Cosa vuoi studiare">
        <TextInput value={title} onChange={setTitle} placeholder="Es. Linee guida ESC fibrillazione atriale" autoFocus />
      </Field>
      <Button
        variant="primary"
        className="w-full"
        disabled={!title.trim()}
        onClick={async () => {
          await createStudyGoal(title.trim(), month)
          onClose()
        }}
      >
        Aggiungi
      </Button>
    </Sheet>
  )
}

function GoalSheet({ g, onClose }: { g: StudyGoal; onClose: () => void }) {
  const [progress, setProgress] = useState(g.progress)
  const [note, setNote] = useState('')
  const [title, setTitle] = useState(g.goal.title)

  const save = async () => {
    if (title.trim() && title.trim() !== g.goal.title) await updateRecord(db.goals, g.goal.id, { title: title.trim() })
    if (progress !== g.progress || note.trim()) {
      await createRecord(db.goalUpdates, { goalId: g.goal.id, date: toISODate(new Date()), value: progress, note: note.trim() })
    }
    showToast(progress === 100 ? 'Obiettivo completato' : 'Progresso salvato')
    onClose()
  }

  const remove = async () => {
    await softDelete(db.goals, g.goal.id)
    showToast('Obiettivo eliminato', () => undoDelete(db.goals, g.goal.id))
    onClose()
  }

  return (
    <Sheet title="Come sta andando?" onClose={onClose}>
      <Field label="Obiettivo">
        <TextInput value={title} onChange={setTitle} />
      </Field>
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-medium opacity-70">Avanzamento</span>
          <span className="text-3xl font-bold tabular-nums">{progress}%</span>
        </div>
        <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-emerald-600" aria-label="Avanzamento in percentuale" />
        <div className="mt-2 grid grid-cols-5 gap-2">
          {[0, 25, 50, 75, 100].map((v) => (
            <button key={v} type="button" onClick={() => setProgress(v)} className={`h-10 rounded-xl text-sm font-semibold ${progress === v ? 'bg-ox-900 text-cream dark:bg-ochre dark:text-ox-950' : 'bg-ox-900/8 dark:bg-cream/10'}`}>
              {v}%
            </button>
          ))}
        </div>
      </div>
      <Field label="Come sto procedendo (facoltativo)">
        <TextInput value={note} onChange={setNote} placeholder="Es. finiti i capitoli 1–3" />
      </Field>
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={save}>Salva</Button>
        <Button variant="danger" onClick={remove}>Elimina</Button>
      </div>
      {g.updates.length > 0 && (
        <List>
          {g.updates.map((u) => (
            <ListRow key={u.id} title={`${u.value}%`} subtitle={[dayLabel(u.date), u.note].filter(Boolean).join(' · ')} />
          ))}
        </List>
      )}
    </Sheet>
  )
}
