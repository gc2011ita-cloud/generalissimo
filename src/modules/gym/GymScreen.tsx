import { useState } from 'react'
import { Banner, Button, List, ListRow, Screen, SectionTitle, Sheet } from '../../components/ui'
import { dayLabel, formatNumber } from '../../lib/format'
import { navigate } from '../../lib/router'
import { ACTIVITY_LABELS, ActivityForm } from './ActivityForm'
import { sortWorkouts } from './calc'
import { startSession, useActiveSession, useGymData, useTemplates } from './queries'

export function GymScreen() {
  const active = useActiveSession()
  const templates = useTemplates()
  const gym = useGymData()
  const [activity, setActivity] = useState(false)

  const start = async (templateId: string | null) => {
    const id = await startSession(templateId)
    navigate(`/gym/session?id=${id}`)
  }

  const recent = sortWorkouts(gym?.workouts ?? []).reverse().slice(0, 15)
  const setCount = (id: string) => gym?.sets.filter((s) => s.workoutId === id).length ?? 0

  return (
    <Screen title="Palestra">
      {active ? (
        <Banner>
          <p className="font-semibold">Allenamento in corso</p>
          <Button variant="primary" className="mt-2" onClick={() => navigate(`/gym/session?id=${active.id}`)}>
            Riprendi
          </Button>
        </Banner>
      ) : (
        <>
          <SectionTitle action={<button type="button" className="min-h-11 text-sm text-ochre-700 dark:text-ochre" onClick={() => navigate('/gym/templates')}>Schede</button>}>
            Inizia
          </SectionTitle>
          <List>
            {(templates ?? []).map((t) => (
              <ListRow key={t.id} title={t.name} subtitle={`${t.items.length} esercizi`} right="›" onClick={() => start(t.id)} />
            ))}
            <ListRow title="Allenamento libero" subtitle="Senza scheda" right="›" onClick={() => start(null)} />
          </List>
        </>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => setActivity(true)}>Attività</Button>
        <Button onClick={() => navigate('/gym/body')}>Peso e misure</Button>
        <Button onClick={() => navigate('/gym/exercises')}>Progressi</Button>
      </div>

      <SectionTitle>Ultimi allenamenti</SectionTitle>
      {recent.length === 0 && <p className="px-1 opacity-60">Ancora nessun allenamento.</p>}
      {recent.length > 0 && (
        <List>
          {recent.map((w) => (
            <ListRow
              key={w.id}
              title={w.type === 'gym' ? `Palestra · ${setCount(w.id)} serie` : ACTIVITY_LABELS[w.type]}
              subtitle={[
                dayLabel(w.date),
                w.duration ? `${w.duration} min` : null,
                w.distance ? `${formatNumber(w.distance)} km` : null,
                w.elevation ? `${formatNumber(w.elevation)} m D+` : null,
                w.endedAt === null ? 'in corso' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              right={w.type === 'gym' ? '›' : undefined}
              onClick={w.type === 'gym' ? () => navigate(`/gym/session?id=${w.id}`) : undefined}
            />
          ))}
        </List>
      )}

      {activity && (
        <Sheet title="Attività all'aperto" onClose={() => setActivity(false)}>
          <ActivityForm onDone={() => setActivity(false)} />
        </Sheet>
      )}
    </Screen>
  )
}
