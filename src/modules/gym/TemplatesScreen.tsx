import { useState } from 'react'
import { BackButton, Button, Field, List, ListRow, Screen, Sheet, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord, softDelete, undoDelete, updateRecord } from '../../db/repo'
import type { WorkoutTemplate, WorkoutTemplateItem } from '../../db/schema'
import { showToast } from '../../lib/toast'
import { ExercisePicker } from './ExercisePicker'
import { useExerciseMap, useTemplates } from './queries'

export function TemplatesScreen() {
  const templates = useTemplates()
  const exercises = useExerciseMap()
  const [editing, setEditing] = useState<WorkoutTemplate | 'new' | null>(null)

  return (
    <Screen title="Schede" back={<BackButton to="/gym/sessions" label="Allenamenti" />}>
      <List>
        {(templates ?? []).map((t) => (
          <ListRow
            key={t.id}
            title={t.name}
            subtitle={t.items.map((i) => exercises?.get(i.exerciseId)?.name).filter(Boolean).join(', ') || 'Vuota'}
            right="›"
            onClick={() => setEditing(t)}
          />
        ))}
        {templates?.length === 0 && <ListRow title="Nessuna scheda" subtitle="Crea la prima qui sotto" />}
      </List>
      <Button variant="primary" onClick={() => setEditing('new')}>
        Nuova scheda
      </Button>
      {editing && <TemplateEditor template={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </Screen>
  )
}

function Stepper({ value, onChange, min = 1, step = 1, label }: { value: number; onChange: (v: number) => void; min?: number; step?: number; label: string }) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      <button type="button" className="h-9 w-9 rounded-lg bg-ox-900/8 dark:bg-cream/10" onClick={() => onChange(Math.max(min, value - step))} aria-label={`Meno ${label}`}>
        −
      </button>
      <span className="w-10 text-center tabular-nums">{value}</span>
      <button type="button" className="h-9 w-9 rounded-lg bg-ox-900/8 dark:bg-cream/10" onClick={() => onChange(value + step)} aria-label={`Più ${label}`}>
        +
      </button>
    </div>
  )
}

function TemplateEditor({ template, onClose }: { template?: WorkoutTemplate; onClose: () => void }) {
  const exercises = useExerciseMap()
  const [name, setName] = useState(template?.name ?? '')
  const [items, setItems] = useState<WorkoutTemplateItem[]>(template?.items ?? [])
  const [picking, setPicking] = useState(false)

  const update = (i: number, patch: Partial<WorkoutTemplateItem>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const move = (i: number, d: number) =>
    setItems((list) => {
      const j = i + d
      if (j < 0 || j >= list.length) return list
      const copy = [...list]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })

  const save = async () => {
    const data = { name: name.trim() || 'Scheda', items }
    if (template) await updateRecord(db.workoutTemplates, template.id, data)
    else await createRecord(db.workoutTemplates, data)
    onClose()
  }

  const remove = async () => {
    if (!template) return
    await softDelete(db.workoutTemplates, template.id)
    showToast('Scheda eliminata', () => undoDelete(db.workoutTemplates, template.id))
    onClose()
  }

  return (
    <Sheet title={template ? 'Modifica scheda' : 'Nuova scheda'} onClose={onClose}>
      <Field label="Nome">
        <TextInput value={name} onChange={setName} placeholder="Es. Spinta, Gambe, Full body" />
      </Field>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={`${it.exerciseId}-${i}`} className="rounded-2xl bg-white p-3 dark:bg-ox-800">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{exercises?.get(it.exerciseId)?.name}</span>
              <div className="flex gap-1">
                <button type="button" className="h-9 w-9" onClick={() => move(i, -1)} aria-label="Sposta su">↑</button>
                <button type="button" className="h-9 w-9" onClick={() => move(i, 1)} aria-label="Sposta giù">↓</button>
                <button type="button" className="h-9 w-9 text-red-600" onClick={() => setItems((l) => l.filter((_, j) => j !== i))} aria-label="Togli">✕</button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>Serie<Stepper label="serie" value={it.sets} onChange={(v) => update(i, { sets: v })} /></div>
              <div>Ripetizioni<Stepper label="ripetizioni" value={it.reps} onChange={(v) => update(i, { reps: v })} /></div>
              <div>Recupero (s)<Stepper label="recupero" value={it.restSeconds} step={15} min={15} onChange={(v) => update(i, { restSeconds: v })} /></div>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={() => setPicking(true)}>+ Aggiungi esercizio</Button>
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={save}>
          Salva
        </Button>
        {template && (
          <Button variant="danger" onClick={remove}>
            Elimina
          </Button>
        )}
      </div>
      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(id) => {
            setItems((l) => [...l, { exerciseId: id, sets: 3, reps: 8, restSeconds: 120 }])
            setPicking(false)
          }}
        />
      )}
    </Sheet>
  )
}
