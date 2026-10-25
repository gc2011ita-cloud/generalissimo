import { useState } from 'react'
import { Button, DecimalInput, Field, Segmented, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord, nowISO } from '../../db/repo'
import type { WorkoutType } from '../../db/schema'
import { toISODate } from '../../lib/dates'
import { parseDecimal } from '../../lib/format'
import { showToast } from '../../lib/toast'

export const ACTIVITY_LABELS: Record<WorkoutType, string> = {
  gym: 'Palestra',
  run: 'Corsa',
  bike: 'Bici',
  mountain: 'Montagna',
  other: 'Altro',
}

const OPTIONS = (['run', 'bike', 'mountain', 'other'] as const).map((t) => [t, ACTIVITY_LABELS[t]] as const)

/** Attività fuori dalla palestra: corsa, bici, montagna… */
export function ActivityForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<Exclude<WorkoutType, 'gym'>>('run')
  const [date, setDate] = useState(toISODate(new Date()))
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [elevation, setElevation] = useState('')
  const [note, setNote] = useState('')

  const save = async () => {
    await createRecord(db.workouts, {
      date,
      templateId: null,
      type,
      duration: parseDecimal(duration),
      distance: parseDecimal(distance),
      elevation: parseDecimal(elevation),
      note: note.trim(),
      endedAt: nowISO(),
    })
    showToast(`${ACTIVITY_LABELS[type]} salvata`)
    onDone()
  }

  return (
    <div className="space-y-3">
      <Segmented value={type} options={OPTIONS} onChange={setType} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Durata (min)"><DecimalInput value={duration} onChange={setDuration} inputMode="numeric" /></Field>
        <Field label="Distanza (km)"><DecimalInput value={distance} onChange={setDistance} /></Field>
        <Field label="Dislivello (m)"><DecimalInput value={elevation} onChange={setElevation} inputMode="numeric" /></Field>
        <Field label="Data">
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10" />
        </Field>
      </div>
      <Field label="Nota"><TextInput value={note} onChange={setNote} /></Field>
      <Button variant="primary" className="w-full" onClick={save} disabled={!parseDecimal(duration) && !parseDecimal(distance)}>
        Salva
      </Button>
    </div>
  )
}
