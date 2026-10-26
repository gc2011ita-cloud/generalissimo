import { useState } from 'react'
import { Button, Chip, Field, List, ListRow, Sheet, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord } from '../../db/repo'
import { MUSCLE_GROUPS } from '../../db/seed'
import { groupByArea } from './areas'
import { useExercises } from './queries'

/** Scelta di un esercizio, con ricerca e creazione al volo. */
export function ExercisePicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const exercises = useExercises()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [muscle, setMuscle] = useState<string>(MUSCLE_GROUPS[0])

  const q = search.trim().toLowerCase()
  const filtered = (exercises ?? []).filter((e) => !q || e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q))
  const groups = groupByArea(filtered, (e) => e.muscleGroup)

  const create = async () => {
    const e = await createRecord(db.exercises, { name: search.trim(), muscleGroup: muscle, equipment: '' })
    onPick(e.id)
  }

  return (
    <Sheet title="Scegli esercizio" onClose={onClose}>
      <TextInput value={search} onChange={setSearch} placeholder="Cerca o scrivi un nuovo esercizio" />
      {search.trim() && !creating && (
        <Button onClick={() => setCreating(true)}>+ Crea “{search.trim()}”</Button>
      )}
      {creating && (
        <Field label="Gruppo muscolare" group>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((m) => (
              <Chip key={m} selected={m === muscle} onClick={() => setMuscle(m)}>
                {m}
              </Chip>
            ))}
          </div>
          <Button variant="primary" className="mt-3" onClick={create}>
            Crea e aggiungi
          </Button>
        </Field>
      )}
      {groups.map(([m, list]) => (
        <div key={m} className="space-y-2">
          <h3 className="px-1 text-sm font-semibold opacity-70">{m}</h3>
          <List>
            {list.map((e) => (
              <ListRow key={e.id} title={e.name} subtitle={[e.muscleGroup, e.equipment].filter(Boolean).join(' · ')} onClick={() => onPick(e.id)} />
            ))}
          </List>
        </div>
      ))}
    </Sheet>
  )
}
