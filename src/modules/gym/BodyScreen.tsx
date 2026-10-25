import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BackButton, Button, Card, List, ListRow, Screen, Sheet } from '../../components/ui'
import { db } from '../../db/db'
import { softDelete, undoDelete } from '../../db/repo'
import { useChartColors } from '../../lib/chartColors'
import { dayLabel, formatNumber } from '../../lib/format'
import { showToast } from '../../lib/toast'
import { BodyMetricForm } from './BodyMetricForm'

export function BodyScreen() {
  const metrics = useLiveQuery(async () => (await db.bodyMetrics.orderBy('date').toArray()).filter((m) => m.deletedAt === null))
  const colors = useChartColors()
  const [adding, setAdding] = useState(false)
  const weights = (metrics ?? []).filter((m) => m.weight).map((m) => ({ label: m.date.slice(5), date: m.date, weight: m.weight }))

  return (
    <Screen title="Peso e misure" back={<BackButton to="/gym" label="Palestra" />}>
      <Button variant="primary" onClick={() => setAdding(true)}>
        Registra peso o misure
      </Button>
      {weights.length > 1 && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Peso (kg)</h2>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={weights}>
                <CartesianGrid vertical={false} stroke={colors.grid} />
                <XAxis dataKey="label" stroke={colors.text} fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke={colors.text} fontSize={11} tickLine={false} axisLine={false} width={36} domain={['auto', 'auto']} />
                <Tooltip formatter={(v) => `${formatNumber(Number(v))} kg`} contentStyle={{ background: colors.surface, border: 'none', borderRadius: 12, color: colors.text }} />
                <Line dataKey="weight" name="Peso" stroke={colors.s1} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      <List>
        {[...(metrics ?? [])].reverse().map((m) => (
          <ListRow
            key={m.id}
            title={m.weight ? `${formatNumber(m.weight)} kg` : 'Misure'}
            subtitle={[
              dayLabel(m.date),
              m.waist && `vita ${formatNumber(m.waist)}`,
              m.chest && `torace ${formatNumber(m.chest)}`,
              m.arm && `braccio ${formatNumber(m.arm)}`,
              m.thigh && `coscia ${formatNumber(m.thigh)}`,
              m.note,
            ]
              .filter(Boolean)
              .join(' · ')}
            right={
              <button
                type="button"
                aria-label="Elimina"
                className="min-h-11 px-2 opacity-60"
                onClick={async () => {
                  await softDelete(db.bodyMetrics, m.id)
                  showToast('Misura eliminata', () => undoDelete(db.bodyMetrics, m.id))
                }}
              >
                ✕
              </button>
            }
          />
        ))}
      </List>
      {adding && (
        <Sheet title="Peso e misure" onClose={() => setAdding(false)}>
          <BodyMetricForm full onDone={() => setAdding(false)} />
        </Sheet>
      )}
    </Screen>
  )
}
