import { useState } from 'react'
import { Banner, Button, Card, Chip, Field, List, ListRow, Screen, SectionTitle, Segmented, Sheet } from '../../components/ui'
import { newId } from '../../db/repo'
import { saveSettings } from '../../db/settings'
import type { Pause, PauseReason } from '../../db/schema'
import { toISODate } from '../../lib/dates'
import { dayLabel, monthLabel } from '../../lib/format'
import { navigate } from '../../lib/router'
import { showToast } from '../../lib/toast'
import { StatusPill } from './labels'
import { useGoalsOverview } from './useOverview'

export const PAUSE_LABEL: Record<PauseReason, string> = { vacation: 'Vacanza', trip: 'Trasferta', sick: 'Malattia' }

export function GoalsScreen() {
  const o = useGoalsOverview()
  const [pauses, setPauses] = useState(false)
  const [target, setTarget] = useState(false)
  if (!o) return null
  const month = toISODate(new Date()).slice(0, 7)

  return (
    <Screen title="Obiettivi">
      {o.paused ? (
        <Banner tone="info">
          <p className="font-semibold">
            {PAUSE_LABEL[o.paused.reason]} fino a {dayLabel(o.paused.to)}
          </p>
          <p className="text-sm opacity-75">Sport e studio non vengono conteggiati in questi giorni.</p>
        </Banner>
      ) : null}

      <SectionTitle action={<button type="button" className="min-h-11 text-sm text-ochre-700 dark:text-ochre" onClick={() => navigate('/study')}>Studio ›</button>}>
        Studio · {monthLabel(month)}
      </SectionTitle>
      {o.study.length === 0 ? (
        <Card>
          <p className="text-sm opacity-70">Nessun target per questo mese.</p>
          <Button variant="primary" className="mt-2" onClick={() => navigate('/study')}>Imposta i target</Button>
        </Card>
      ) : (
        <List>
          {o.study.map((s) => (
            <ListRow key={s.id} onClick={() => navigate('/study')} title={s.title} subtitle={`${s.progress}%`} right={<StatusPill status={s.status} />} />
          ))}
        </List>
      )}

      <SectionTitle action={<button type="button" className="min-h-11 text-sm text-ochre-700 dark:text-ochre" onClick={() => setTarget(true)}>Obiettivo</button>}>
        Sport
      </SectionTitle>
      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {o.sport.week}
            {o.sport.target ? <span className="text-base font-medium opacity-60"> / {o.sport.target}</span> : null}
          </p>
          <p className="text-sm opacity-65">giorni questa settimana · {o.sport.month} nel mese</p>
        </div>
        {o.sport.status ? <StatusPill status={o.sport.status} /> : <Button onClick={() => navigate('/gym')}>Calendario</Button>}
      </Card>


      <SectionTitle action={<button type="button" className="min-h-11 text-sm text-ochre-700 dark:text-ochre" onClick={() => setPauses(true)}>Gestisci</button>}>
        Vacanze e trasferte
      </SectionTitle>
      <List>
        {o.pauses.length === 0 && <ListRow title="Nessuna pausa" subtitle="In vacanza o in trasferta sport e studio non contano" onClick={() => setPauses(true)} />}
        {[...o.pauses].sort((a, b) => b.from.localeCompare(a.from)).slice(0, 3).map((p) => (
          <ListRow key={p.id} title={PAUSE_LABEL[p.reason]} subtitle={`${dayLabel(p.from)} – ${dayLabel(p.to)}`} onClick={() => setPauses(true)} />
        ))}
      </List>

      {pauses && <PausesSheet pauses={o.pauses} onClose={() => setPauses(false)} />}
      {target && (
        <Sheet title="Giorni di sport a settimana" onClose={() => setTarget(false)}>
          <Field label="Obiettivo" group>
            <div className="flex flex-wrap gap-2">
              <Chip selected={!o.sportTarget} onClick={() => saveSettings({ sportWeeklyTarget: null })}>Nessuno</Chip>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <Chip key={n} selected={o.sportTarget === n} onClick={() => saveSettings({ sportWeeklyTarget: n })}>{n}</Chip>
              ))}
            </div>
          </Field>
        </Sheet>
      )}
    </Screen>
  )
}

function PausesSheet({ pauses, onClose }: { pauses: Pause[]; onClose: () => void }) {
  const today = toISODate(new Date())
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [reason, setReason] = useState<PauseReason>('vacation')

  const add = async () => {
    await saveSettings({ pauses: [...pauses, { id: newId(), from, to: to < from ? from : to, reason }] })
    showToast(`${PAUSE_LABEL[reason]} aggiunta`)
  }
  const remove = async (p: Pause) => {
    await saveSettings({ pauses: pauses.filter((x) => x.id !== p.id) })
    showToast('Pausa eliminata', () => saveSettings({ pauses }))
  }

  return (
    <Sheet title="Vacanze e trasferte" onClose={onClose}>
      <Segmented value={reason} options={[['vacation', 'Vacanza'], ['trip', 'Trasferta'], ['sick', 'Malattia']] as const} onChange={setReason} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Dal">
          <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10" />
        </Field>
        <Field label="Al">
          <input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10" />
        </Field>
      </div>
      <Button variant="primary" className="w-full" onClick={add}>Aggiungi</Button>
      {pauses.length > 0 && (
        <List>
          {[...pauses].sort((a, b) => b.from.localeCompare(a.from)).map((p) => (
            <ListRow
              key={p.id}
              title={PAUSE_LABEL[p.reason]}
              subtitle={`${dayLabel(p.from)} – ${dayLabel(p.to)}`}
              right={<button type="button" aria-label="Elimina" className="min-h-11 px-2 opacity-60" onClick={() => remove(p)}>✕</button>}
            />
          ))}
        </List>
      )}
    </Sheet>
  )
}
