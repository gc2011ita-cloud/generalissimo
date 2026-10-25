import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { BackButton, Button, Card, Field, Screen, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord, updateRecord } from '../../db/repo'
import { getSettings } from '../../db/settings'
import type { DayLog } from '../../db/schema'
import { dayLabel } from '../../lib/format'
import { navigate, useLocation } from '../../lib/router'
import { showToast } from '../../lib/toast'
import { checkInDate, prefillAnswers } from './calc'

function Scale({ value, max, onChange, label }: { value: number | null; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-1.5 ${max === 10 ? 'grid-cols-5' : 'grid-cols-5'}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={`h-12 rounded-xl text-lg font-bold tabular-nums ${
            value === n ? 'bg-ox-900 text-cream dark:bg-ochre dark:text-ox-950' : 'bg-ox-900/8 dark:bg-cream/10'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function YesNo({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  const btn = (v: boolean, label: string) => (
    <button
      type="button"
      aria-pressed={value === v}
      onClick={() => onChange(v)}
      className={`h-10 w-14 rounded-lg text-sm font-semibold ${
        value === v ? 'bg-ox-900 text-cream dark:bg-ochre dark:text-ox-950' : 'bg-ox-900/8 dark:bg-cream/10'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div className="flex gap-1.5">
      {btn(true, 'Sì')}
      {btn(false, 'No')}
    </div>
  )
}

export function CheckInScreen() {
  const { query } = useLocation()
  const date = query.get('date') ?? checkInDate(new Date())
  const data = useLiveQuery(async () => {
    const [log, settings, workouts, study] = await Promise.all([
      db.dayLogs.where('date').equals(date).first(),
      getSettings(),
      db.workouts.where('date').equals(date).filter((w) => w.deletedAt === null).count(),
      db.studySessions.filter((s) => s.deletedAt === null && s.start.startsWith(date)).count(),
    ])
    return { log, settings, facts: { workout: workouts > 0, study: study > 0 } }
  }, [date])

  const [form, setForm] = useState<{
    overallScore: number | null
    satisfaction: number | null
    tiredness: number | null
    answers: Record<string, boolean | undefined>
    bedtime: string
    wakeTime: string
    improve: string
    note: string
  } | null>(null)

  useEffect(() => {
    if (!data || form) return
    const log = data.log?.deletedAt === null ? data.log : undefined
    setForm({
      overallScore: log?.overallScore ?? null,
      satisfaction: log?.satisfaction ?? null,
      tiredness: log?.tiredness ?? null,
      answers: prefillAnswers(data.settings.checkInQuestions, log?.answers, data.facts),
      bedtime: log?.bedtime ?? '',
      wakeTime: log?.wakeTime ?? '',
      improve: log?.improve ?? '',
      note: log?.note ?? '',
    })
  }, [data, form])

  if (!data || !form) return null
  const set = <K extends keyof NonNullable<typeof form>>(k: K, v: NonNullable<typeof form>[K]) => setForm({ ...form, [k]: v })

  const save = async () => {
    const answers = Object.fromEntries(Object.entries(form.answers).filter(([, v]) => v !== undefined)) as Record<string, boolean>
    const values: Omit<DayLog, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
      date,
      overallScore: form.overallScore,
      satisfaction: form.satisfaction,
      tiredness: form.tiredness,
      answers,
      bedtime: form.bedtime || null,
      wakeTime: form.wakeTime || null,
      improve: form.improve.trim(),
      note: form.note.trim(),
    }
    // La data è unica: un check-in cancellato si riattiva invece di crearne un altro.
    if (data.log) await updateRecord(db.dayLogs, data.log.id, { ...values, deletedAt: null } as never)
    else await createRecord(db.dayLogs, values)
    showToast('Check-in salvato')
    navigate('/diary')
  }

  return (
    <Screen title="Check-in" back={<BackButton to="/diary" label="Diario" />}>
      <p className="-mt-2 capitalize opacity-65">{dayLabel(date)}</p>

      <Card>
        <h2 className="mb-2 font-semibold">Voto alla giornata</h2>
        <Scale label="Voto alla giornata" value={form.overallScore} max={10} onChange={(v) => set('overallScore', v)} />
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="mb-2 font-semibold">Soddisfazione</h2>
          <Scale label="Soddisfazione" value={form.satisfaction} max={5} onChange={(v) => set('satisfaction', v)} />
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Stanchezza</h2>
          <Scale label="Stanchezza" value={form.tiredness} max={5} onChange={(v) => set('tiredness', v)} />
        </div>
      </Card>

      <Card className="divide-y divide-ox-900/8 py-1 dark:divide-cream/10">
        {data.settings.checkInQuestions.map((q) => (
          <div key={q.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
            <span>{q.label}</span>
            <YesNo value={form.answers[q.id]} onChange={(v) => set('answers', { ...form.answers, [q.id]: v })} />
          </div>
        ))}
      </Card>

      <Card className="grid grid-cols-2 gap-3">
        <Field label="A letto ieri sera">
          <input type="time" value={form.bedtime} onChange={(e) => set('bedtime', e.target.value)} className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10" />
        </Field>
        <Field label="Sveglia stamattina">
          <input type="time" value={form.wakeTime} onChange={(e) => set('wakeTime', e.target.value)} className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10" />
        </Field>
      </Card>

      <Card className="space-y-3">
        <Field label="Una cosa da migliorare">
          <TextInput value={form.improve} onChange={(v) => set('improve', v)} />
        </Field>
        <Field label="Nota">
          <TextInput value={form.note} onChange={(v) => set('note', v)} />
        </Field>
      </Card>

      <Button variant="primary" className="w-full" onClick={save} disabled={form.overallScore === null}>
        Salva
      </Button>
    </Screen>
  )
}
