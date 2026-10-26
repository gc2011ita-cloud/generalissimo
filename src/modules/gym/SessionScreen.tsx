import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { BackButton, Button, Card, DecimalInput, Screen } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord, softDelete, undoDelete, updateRecord } from '../../db/repo'
import { getSettings } from '../../db/settings'
import type { WorkoutSet } from '../../db/schema'
import { dayLabel, formatNumber, parseDecimal } from '../../lib/format'
import { navigate, useLocation } from '../../lib/router'
import { showToast } from '../../lib/toast'
import { useWakeLock } from '../../lib/wakeLock'
import { epley1RM, previousSets, suggestWeight } from './calc'
import { ExercisePicker } from './ExercisePicker'
import { finishSession, useExerciseMap, useGymData } from './queries'
import { primeAudio, startRest } from './restTimer'

interface PlanItem {
  exerciseId: string
  sets: number
  reps: number
  restSeconds: number
}

export function SessionScreen() {
  const { query } = useLocation()
  const id = query.get('id') ?? ''
  const workout = useLiveQuery(() => db.workouts.get(id), [id])
  const template = useLiveQuery(async () => (workout?.templateId ? db.workoutTemplates.get(workout.templateId) : undefined), [workout?.templateId])
  const settings = useLiveQuery(() => getSettings())
  const gym = useGymData()
  const exercises = useExerciseMap()
  const [added, setAdded] = useState<string[]>([])
  const [extraRows, setExtraRows] = useState<Record<string, number>>({})
  const [picking, setPicking] = useState(false)

  const active = !!workout && workout.endedAt === null && workout.deletedAt === null
  useWakeLock(active)

  const mySets = useMemo(() => (gym?.sets ?? []).filter((s) => s.workoutId === id), [gym, id])

  const plan: PlanItem[] = useMemo(() => {
    const rest = settings?.defaultRestSeconds ?? 120
    const items: PlanItem[] = (template?.items ?? []).map((i) => ({ ...i }))
    const seen = new Set(items.map((i) => i.exerciseId))
    for (const exId of [...[...mySets].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((s) => s.exerciseId), ...added]) {
      if (!seen.has(exId)) {
        seen.add(exId)
        items.push({ exerciseId: exId, sets: 3, reps: 8, restSeconds: rest })
      }
    }
    return items
  }, [template, mySets, added, settings])

  if (workout === undefined || !gym || !exercises || !settings) return null
  if (!workout) {
    return (
      <Screen title="Allenamento" back={<BackButton to="/gym/sessions" label="Allenamenti" />}>
        <p>Allenamento non trovato.</p>
      </Screen>
    )
  }

  const finish = async () => {
    await finishSession(id)
    showToast(`Allenamento salvato: ${mySets.length} serie`)
    navigate('/gym/sessions')
  }

  const discard = async () => {
    await softDelete(db.workouts, id)
    showToast('Allenamento eliminato', () => undoDelete(db.workouts, id))
    navigate('/gym/sessions')
  }

  return (
    <Screen
      title={template?.name ?? (active ? 'Allenamento libero' : 'Allenamento')}
      back={<BackButton to="/gym/sessions" label="Allenamenti" />}
    >
      <p className="-mt-2 opacity-65">
        {dayLabel(workout.date)}
        {active ? ' · in corso' : workout.duration ? ` · ${workout.duration} min` : ''}
      </p>

      {plan.map((item) => (
        <ExerciseBlock
          key={item.exerciseId}
          workoutId={id}
          item={item}
          name={exercises.get(item.exerciseId)?.name ?? 'Esercizio'}
          sets={mySets.filter((s) => s.exerciseId === item.exerciseId).sort((a, b) => a.order - b.order)}
          prev={previousSets(item.exerciseId, gym.sets, gym.workouts, id)}
          rows={Math.max(item.sets, mySets.filter((s) => s.exerciseId === item.exerciseId).length) + (extraRows[item.exerciseId] ?? 0)}
          onAddRow={() => setExtraRows((r) => ({ ...r, [item.exerciseId]: (r[item.exerciseId] ?? 0) + 1 }))}
          progressionKg={settings.progressionKg}
        />
      ))}

      <Button onClick={() => setPicking(true)}>+ Aggiungi esercizio</Button>

      <div className="flex gap-2 pt-2">
        {active && (
          <Button variant="primary" className="flex-1" onClick={finish}>
            Termina allenamento
          </Button>
        )}
        <Button variant="danger" onClick={discard}>
          Elimina
        </Button>
      </div>

      {/* spazio per il timer di recupero, che compare sopra la barra */}
      <div className="h-20" aria-hidden />

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(exId) => {
            setAdded((a) => [...a, exId])
            setPicking(false)
          }}
        />
      )}
    </Screen>
  )
}

function ExerciseBlock({
  workoutId,
  item,
  name,
  sets,
  prev,
  rows,
  onAddRow,
  progressionKg,
}: {
  workoutId: string
  item: PlanItem
  name: string
  sets: WorkoutSet[]
  prev: WorkoutSet[]
  rows: number
  onAddRow: () => void
  progressionKg: number
}) {
  const suggestion = suggestWeight(prev, item.reps, progressionKg)
  const prevText = prev.filter((s) => s.weight && s.reps).map((s) => `${formatNumber(s.weight!)}×${s.reps}`).join(', ')

  return (
    <Card>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{name}</h2>
          <p className="text-sm opacity-65">
            {item.sets}×{item.reps}
            {prevText && ` · ultima volta ${prevText}`}
          </p>
        </div>
        {suggestion?.increased && (
          <span className="shrink-0 rounded-full bg-ochre/25 px-2 py-1 text-xs font-semibold">+{formatNumber(progressionKg)} kg</span>
        )}
      </div>
      <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_2.75rem] items-center gap-2 text-xs opacity-60">
        <span>#</span>
        <span>kg</span>
        <span>rip.</span>
        <span>RIR</span>
        <span />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <SetRow
          key={sets[i]?.id ?? `new-${i}`}
          index={i}
          saved={sets[i]}
          defaults={{
            weight: suggestion?.weight ?? prev[i]?.weight ?? null,
            reps: prev[i]?.reps ?? item.reps,
            rir: prev[i]?.rir ?? null,
          }}
          onSave={async (v) => {
            primeAudio()
            await createRecord(db.workoutSets, {
              workoutId,
              exerciseId: item.exerciseId,
              order: i,
              weight: v.weight,
              reps: v.reps,
              rir: v.rir,
              isWarmup: false,
            })
            startRest(item.restSeconds)
          }}
        />
      ))}
      <button type="button" onClick={onAddRow} className="mt-1 min-h-11 text-sm font-medium text-ochre-700 dark:text-ochre">
        + Serie
      </button>
    </Card>
  )
}

const str = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))

function SetRow({
  index,
  saved,
  defaults,
  onSave,
}: {
  index: number
  saved?: WorkoutSet
  defaults: { weight: number | null; reps: number | null; rir: number | null }
  onSave: (v: { weight: number | null; reps: number | null; rir: number | null }) => Promise<void>
}) {
  const [weight, setWeight] = useState(str(saved?.weight ?? defaults.weight))
  const [reps, setReps] = useState(str(saved?.reps ?? defaults.reps))
  const [rir, setRir] = useState(str(saved?.rir ?? defaults.rir))

  const values = () => ({ weight: parseDecimal(weight), reps: parseDecimal(reps), rir: parseDecimal(rir) })

  const persistEdit = async () => {
    if (!saved) return
    const v = values()
    if (v.weight !== saved.weight || v.reps !== saved.reps || v.rir !== saved.rir) await updateRecord(db.workoutSets, saved.id, v)
  }

  const remove = async () => {
    if (!saved) return
    await softDelete(db.workoutSets, saved.id)
    showToast('Serie eliminata', () => undoDelete(db.workoutSets, saved.id))
  }

  const v = values()
  const rm = v.weight && v.reps ? epley1RM(v.weight, v.reps) : null
  const done = !!saved
  const inputCls = `px-2 py-2 text-center tabular-nums ${done ? 'bg-emerald-600/10! dark:bg-emerald-400/10!' : 'opacity-80'}`

  return (
    <div className="mt-2 grid grid-cols-[1.5rem_1fr_1fr_1fr_2.75rem] items-center gap-2">
      <span className="text-sm opacity-60">{index + 1}</span>
      <DecimalInput value={weight} onChange={setWeight} onBlur={persistEdit} aria-label={`Carico serie ${index + 1}`} className={inputCls} />
      <DecimalInput value={reps} onChange={setReps} onBlur={persistEdit} inputMode="numeric" aria-label={`Ripetizioni serie ${index + 1}`} className={inputCls} />
      <DecimalInput value={rir} onChange={setRir} onBlur={persistEdit} inputMode="numeric" aria-label={`RIR serie ${index + 1}`} className={inputCls} />
      {done ? (
        <button type="button" onClick={remove} aria-label="Elimina serie" title={rm ? `1RM stimato ${formatNumber(rm)} kg` : undefined} className="h-11 rounded-xl bg-emerald-600 text-white">
          ✓
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Completa serie ${index + 1}`}
          disabled={!v.reps}
          onClick={() => onSave(values())}
          className="h-11 rounded-xl bg-ox-900/10 font-bold disabled:opacity-40 dark:bg-cream/15"
        >
          ✓
        </button>
      )}
    </div>
  )
}
