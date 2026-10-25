import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BackButton, Button, Card, Chip, Field, List, ListRow, Screen, SectionTitle, Sheet, Stat, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { softDelete, undoDelete, updateRecord } from '../../db/repo'
import { MUSCLE_GROUPS } from '../../db/seed'
import { useChartColors } from '../../lib/chartColors'
import { isoWeekKey, toISODate } from '../../lib/dates'
import { dayLabel, formatNumber } from '../../lib/format'
import { navigate, useLocation } from '../../lib/router'
import { showToast } from '../../lib/toast'
import { exerciseHistory, weeklyVolumeByMuscle } from './calc'
import { useExerciseMap, useExercises, useGymData } from './queries'

/** Ultime n settimane ISO fino a oggi. */
function lastWeeks(n: number) {
  const out: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) out.push(isoWeekKey(toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - i * 7))))
  return out
}

export function ExercisesScreen() {
  const exercises = useExercises()
  const exMap = useExerciseMap()
  const gym = useGymData()
  const colors = useChartColors()
  const [muscle, setMuscle] = useState<string>('Petto')

  const volume = useMemo(
    () => weeklyVolumeByMuscle(gym?.sets ?? [], gym?.workouts ?? [], (id) => exMap?.get(id)?.muscleGroup),
    [gym, exMap],
  )
  const weeks = lastWeeks(8)
  const data = weeks.map((w) => ({ week: w.slice(5), volume: volume.find((v) => v.week === w && v.muscle === muscle)?.volume ?? 0 }))

  const done = useMemo(() => {
    const ids = new Set((gym?.sets ?? []).map((s) => s.exerciseId))
    return (exercises ?? []).filter((e) => ids.has(e.id))
  }, [gym, exercises])

  return (
    <Screen title="Progressi" back={<BackButton to="/gym" label="Palestra" />}>
      <SectionTitle>Volume settimanale (kg × ripetizioni)</SectionTitle>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {MUSCLE_GROUPS.map((m) => (
          <Chip key={m} selected={m === muscle} onClick={() => setMuscle(m)}>
            {m}
          </Chip>
        ))}
      </div>
      <Card>
        <div className="h-44">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis dataKey="week" stroke={colors.text} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={colors.text} fontSize={11} tickLine={false} axisLine={false} width={44} />
              <Tooltip formatter={(v) => `${formatNumber(Number(v))} kg`} contentStyle={{ background: colors.surface, border: 'none', borderRadius: 12, color: colors.text }} cursor={{ fill: colors.grid, opacity: 0.4 }} />
              <Bar dataKey="volume" name={muscle} fill={colors.s1} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle>Esercizi svolti</SectionTitle>
      {done.length === 0 && <p className="px-1 opacity-60">Registra un allenamento per vedere i progressi.</p>}
      <List>
        {done.map((e) => {
          const h = exerciseHistory(e.id, gym!.sets, gym!.workouts)
          const best = Math.max(0, ...h.map((x) => x.best1RM))
          return <ListRow key={e.id} title={e.name} subtitle={e.muscleGroup} right={`1RM ${formatNumber(best)} kg ›`} onClick={() => navigate(`/gym/exercise?id=${e.id}`)} />
        })}
      </List>
      <SectionTitle>Tutti gli esercizi</SectionTitle>
      <List>
        {(exercises ?? []).map((e) => (
          <ListRow key={e.id} title={e.name} subtitle={e.muscleGroup} right="›" onClick={() => navigate(`/gym/exercise?id=${e.id}`)} />
        ))}
      </List>
    </Screen>
  )
}

export function ExerciseDetailScreen() {
  const { query } = useLocation()
  const id = query.get('id') ?? ''
  const exMap = useExerciseMap()
  const gym = useGymData()
  const colors = useChartColors()
  const [editing, setEditing] = useState(false)
  const exercise = exMap?.get(id)
  if (!exercise || !gym) return null

  const history = exerciseHistory(id, gym.sets, gym.workouts)
  const best = history.reduce((m, h) => Math.max(m, h.best1RM), 0)
  const maxW = history.reduce((m, h) => Math.max(m, h.maxWeight), 0)
  const data = history.map((h) => ({ ...h, label: h.date.slice(5) }))

  return (
    <Screen title={exercise.name} back={<BackButton to="/gym/exercises" label="Progressi" />}>
      <p className="-mt-2 opacity-65">
        {exercise.muscleGroup}
        {exercise.equipment && ` · ${exercise.equipment}`}
      </p>
      <Card className="grid grid-cols-3 gap-2">
        <Stat label="Carico massimo" value={`${formatNumber(maxW)} kg`} />
        <Stat label="1RM stimato" value={`${formatNumber(best)} kg`} />
        <Stat label="Sessioni" value={history.length} />
      </Card>
      {history.length > 1 && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold">1RM stimato (Epley)</h2>
          <div className="h-44">
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid vertical={false} stroke={colors.grid} />
                <XAxis dataKey="label" stroke={colors.text} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.text} fontSize={11} tickLine={false} axisLine={false} width={40} domain={['auto', 'auto']} />
                <Tooltip formatter={(v) => `${formatNumber(Number(v))} kg`} contentStyle={{ background: colors.surface, border: 'none', borderRadius: 12, color: colors.text }} />
                <Line dataKey="best1RM" name="1RM" stroke={colors.s1} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      <List>
        {[...history].reverse().map((h) => (
          <ListRow
            key={h.workoutId}
            title={
              <>
                {dayLabel(h.date)} {h.isPR && <span className="ml-1 rounded-full bg-ochre/30 px-2 text-xs font-semibold">Record</span>}
              </>
            }
            subtitle={`Max ${formatNumber(h.maxWeight)} kg · volume ${formatNumber(h.volume)}`}
            right={`${formatNumber(h.best1RM)} kg`}
            onClick={() => navigate(`/gym/session?id=${h.workoutId}`)}
          />
        ))}
      </List>
      <Button onClick={() => setEditing(true)}>Modifica esercizio</Button>
      {editing && <ExerciseEditor id={id} onClose={() => setEditing(false)} />}
    </Screen>
  )
}

function ExerciseEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const exMap = useExerciseMap()
  const e = exMap?.get(id)
  const [name, setName] = useState(e?.name ?? '')
  const [muscle, setMuscle] = useState(e?.muscleGroup ?? 'Petto')
  const [equipment, setEquipment] = useState(e?.equipment ?? '')
  if (!e) return null
  return (
    <Sheet title="Modifica esercizio" onClose={onClose}>
      <Field label="Nome"><TextInput value={name} onChange={setName} /></Field>
      <Field label="Gruppo muscolare">
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((m) => (
            <Chip key={m} selected={m === muscle} onClick={() => setMuscle(m)}>{m}</Chip>
          ))}
        </div>
      </Field>
      <Field label="Attrezzo"><TextInput value={equipment} onChange={setEquipment} /></Field>
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={async () => { await updateRecord(db.exercises, id, { name: name.trim() || e.name, muscleGroup: muscle, equipment: equipment.trim() }); onClose() }}>
          Salva
        </Button>
        <Button variant="danger" onClick={async () => { await softDelete(db.exercises, id); showToast('Esercizio eliminato', () => undoDelete(db.exercises, id)); navigate('/gym/exercises') }}>
          Elimina
        </Button>
      </div>
    </Sheet>
  )
}
