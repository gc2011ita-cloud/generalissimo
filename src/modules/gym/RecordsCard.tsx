import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Sparkline } from '../../components/Sparkline'
import { Button, Card, DecimalInput, Field, List, ListRow, Sheet, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord, softDelete, undoDelete } from '../../db/repo'
import type { ExerciseRecord } from '../../db/schema'
import { useChartColors } from '../../lib/chartColors'
import { toISODate } from '../../lib/dates'
import { dayLabel, formatNumber, parseDecimal } from '../../lib/format'
import { showToast } from '../../lib/toast'
import { groupByArea } from './areas'
import { recordsByExercise } from './calc'
import { ExercisePicker } from './ExercisePicker'
import { useExerciseMap } from './queries'

/** Massimali: per ogni esercizio peso massimo e ripetizioni, con lo storico dei progressi. */
export function RecordsCard() {
  const records = useLiveQuery(() => db.exerciseRecords.toArray())
  const exercises = useExerciseMap()
  const [picking, setPicking] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  if (!records || !exercises) return null
  const byEx = recordsByExercise(records)
  const list = [...byEx.entries()].sort((a, b) => (exercises.get(a[0])?.name ?? '').localeCompare(exercises.get(b[0])?.name ?? ''))
  const areas = groupByArea(list, ([id]) => exercises.get(id)?.muscleGroup ?? '')

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold">Massimali</h2>
        <button type="button" className="min-h-11 text-sm font-semibold text-ochre-700 dark:text-ochre" onClick={() => setPicking(true)}>
          + Esercizio
        </button>
      </div>
      {list.length === 0 && <p className="text-sm opacity-65">Aggiungi un esercizio con il peso massimo e le ripetizioni: lo aggiorni quando migliori.</p>}
      {areas.map(([area, items]) => (
        <section key={area} aria-label={area} className="mt-2">
          <h3 className="pt-2 text-xs font-semibold tracking-wide uppercase opacity-60">{area}</h3>
          <div className="-mx-4 divide-y divide-ox-900/8 dark:divide-cream/10">
            {items.map(([id, recs]) => (
              <ListRow
                key={id}
                onClick={() => setOpen(id)}
                title={exercises.get(id)?.name ?? 'Esercizio'}
                subtitle={`agg. ${dayLabel(recs[0].date)}${recs.length > 1 ? ` · ${recs.length} aggiornamenti` : ''}`}
                right={
                  <span className="font-semibold tabular-nums">
                    {formatNumber(recs[0].weight)} kg × {recs[0].reps}
                  </span>
                }
              />
            ))}
          </div>
        </section>
      ))}
      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(id) => {
            setPicking(false)
            setOpen(id)
          }}
        />
      )}
      {open && <RecordSheet exerciseId={open} history={byEx.get(open) ?? []} name={exercises.get(open)?.name ?? 'Esercizio'} onClose={() => setOpen(null)} />}
    </Card>
  )
}

function RecordSheet({ exerciseId, history, name, onClose }: { exerciseId: string; history: ExerciseRecord[]; name: string; onClose: () => void }) {
  const colors = useChartColors()
  const last = history[0]
  const [weight, setWeight] = useState(last ? String(last.weight).replace('.', ',') : '')
  const [reps, setReps] = useState(last ? String(last.reps) : '')
  const [date, setDate] = useState(toISODate(new Date()))
  const [note, setNote] = useState('')
  const w = parseDecimal(weight)
  const r = parseDecimal(reps)

  const save = async () => {
    await createRecord(db.exerciseRecords, { exerciseId, date, weight: w!, reps: Math.round(r!), note: note.trim() })
    showToast(`${name}: ${formatNumber(w!)} kg × ${Math.round(r!)}`)
    onClose()
  }

  return (
    <Sheet title={name} onClose={onClose}>
      {history.length > 1 && <Sparkline values={[...history].reverse().map((h) => h.weight)} color={colors.s1} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Peso massimo (kg)">
          <DecimalInput value={weight} onChange={setWeight} autoFocus />
        </Field>
        <Field label="Ripetizioni">
          <DecimalInput value={reps} onChange={setReps} inputMode="numeric" />
        </Field>
        <Field label="Data">
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10" />
        </Field>
        <Field label="Nota">
          <TextInput value={note} onChange={setNote} />
        </Field>
      </div>
      <Button variant="primary" className="w-full" onClick={save} disabled={!w || !r}>
        {last ? 'Aggiorna massimale' : 'Salva'}
      </Button>
      {history.length > 0 && (
        <List>
          {history.map((h) => (
            <ListRow
              key={h.id}
              title={`${formatNumber(h.weight)} kg × ${h.reps}`}
              subtitle={[dayLabel(h.date), h.note].filter(Boolean).join(' · ')}
              right={
                <button
                  type="button"
                  aria-label="Elimina"
                  className="min-h-11 px-2 opacity-60"
                  onClick={async () => {
                    await softDelete(db.exerciseRecords, h.id)
                    showToast('Massimale eliminato', () => undoDelete(db.exerciseRecords, h.id))
                  }}
                >
                  ✕
                </button>
              }
            />
          ))}
        </List>
      )}
    </Sheet>
  )
}
