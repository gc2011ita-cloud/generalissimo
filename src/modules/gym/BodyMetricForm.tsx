import { useState } from 'react'
import { Button, DecimalInput, Field, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord } from '../../db/repo'
import { toISODate } from '../../lib/dates'
import { formatNumber, parseDecimal } from '../../lib/format'
import { showToast } from '../../lib/toast'

/** Peso (e, se vuoi, circonferenze) di oggi. */
export function BodyMetricForm({ onDone, full = false }: { onDone: () => void; full?: boolean }) {
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [chest, setChest] = useState('')
  const [arm, setArm] = useState('')
  const [thigh, setThigh] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [more, setMore] = useState(full)

  const w = parseDecimal(weight)
  const values = { weight: w, waist: parseDecimal(waist), chest: parseDecimal(chest), arm: parseDecimal(arm), thigh: parseDecimal(thigh) }
  const canSave = Object.values(values).some((v) => v !== null && v > 0)

  const save = async () => {
    await createRecord(db.bodyMetrics, { date, ...values, note: note.trim() })
    showToast(w ? `Peso ${formatNumber(w)} kg salvato` : 'Misure salvate')
    onDone()
  }

  return (
    <div className="space-y-3">
      <DecimalInput value={weight} onChange={setWeight} placeholder="Peso (kg)" aria-label="Peso in kg" autoFocus className="text-center text-3xl font-bold" />
      {!more ? (
        <button type="button" onClick={() => setMore(true)} className="min-h-11 text-sm font-medium text-ochre-700 dark:text-ochre">
          Circonferenze, data, nota…
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vita (cm)"><DecimalInput value={waist} onChange={setWaist} /></Field>
          <Field label="Torace (cm)"><DecimalInput value={chest} onChange={setChest} /></Field>
          <Field label="Braccio (cm)"><DecimalInput value={arm} onChange={setArm} /></Field>
          <Field label="Coscia (cm)"><DecimalInput value={thigh} onChange={setThigh} /></Field>
          <Field label="Data">
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10" />
          </Field>
          <Field label="Nota"><TextInput value={note} onChange={setNote} /></Field>
        </div>
      )}
      <Button variant="primary" className="w-full" onClick={save} disabled={!canSave}>
        Salva
      </Button>
    </div>
  )
}
