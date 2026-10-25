import { useLiveQuery } from 'dexie-react-hooks'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BackButton, Button, Card, List, ListRow, Screen, SectionTitle } from '../../components/ui'
import { db } from '../../db/db'
import { useChartColors } from '../../lib/chartColors'
import { toISODate } from '../../lib/dates'
import { dayLabel, formatNumber, monthLabel } from '../../lib/format'
import { navigate } from '../../lib/router'
import { averageBy, heatmapGrid, scoreLevel } from './calc'

const WEEKS = 26
const LEVEL_OPACITY = [0, 0.25, 0.45, 0.7, 1]

export function DiaryScreen() {
  const logs = useLiveQuery(async () => (await db.dayLogs.orderBy('date').toArray()).filter((l) => l.deletedAt === null))
  const colors = useChartColors()
  if (!logs) return null

  const today = toISODate(new Date())
  const scores = new Map(logs.filter((l) => l.overallScore != null).map((l) => [l.date, l.overallScore!]))
  const grid = heatmapGrid(scores, today, WEEKS)
  const weekly = averageBy(logs, 'week').slice(-12).map((w) => ({ ...w, label: w.period.slice(5) }))
  const monthly = averageBy(logs, 'month').reverse()

  return (
    <Screen title="Diario" back={<BackButton to="/more" label="Altro" />}>
      <Button variant="primary" onClick={() => navigate('/checkin')}>
        Check-in di oggi
      </Button>

      <SectionTitle>Voto delle giornate</SectionTitle>
      <Card>
        <div className="flex gap-[3px] overflow-x-auto" role="grid" aria-label="Mappa di calore del voto">
          {grid.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]" role="row">
              {col.map((cell) => (
                <button
                  key={cell.date}
                  type="button"
                  role="gridcell"
                  disabled={!cell.inRange}
                  title={`${cell.date}${cell.score ? `: ${cell.score}` : ''}`}
                  aria-label={`${dayLabel(cell.date)}${cell.score ? `, voto ${cell.score}` : ', nessun check-in'}`}
                  onClick={() => navigate(`/checkin?date=${cell.date}`)}
                  className="h-[11px] w-[11px] rounded-[3px] disabled:opacity-0"
                  style={{
                    background: cell.score ? colors.s1 : colors.grid,
                    opacity: cell.score ? LEVEL_OPACITY[scoreLevel(cell.score)] : 1,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs opacity-70">
          <span>1</span>
          {[1, 2, 3, 4].map((l) => (
            <span key={l} className="inline-block h-[11px] w-[11px] rounded-[3px]" style={{ background: colors.s1, opacity: LEVEL_OPACITY[l] }} />
          ))}
          <span>10 · ultime {WEEKS} settimane, tocca un giorno per modificarlo</span>
        </div>
      </Card>

      {weekly.length > 1 && (
        <>
          <SectionTitle>Media settimanale</SectionTitle>
          <Card>
            <div className="h-44">
              <ResponsiveContainer>
                <LineChart data={weekly}>
                  <CartesianGrid vertical={false} stroke={colors.grid} />
                  <XAxis dataKey="label" stroke={colors.text} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[1, 10]} stroke={colors.text} fontSize={11} tickLine={false} axisLine={false} width={24} />
                  <Tooltip formatter={(v) => formatNumber(Number(v))} contentStyle={{ background: colors.surface, border: 'none', borderRadius: 12, color: colors.text }} />
                  <Line dataKey="average" name="Voto medio" stroke={colors.s1} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {monthly.length > 0 && (
        <>
          <SectionTitle>Media mensile</SectionTitle>
          <List>
            {monthly.map((m) => (
              <ListRow key={m.period} title={<span className="capitalize">{monthLabel(m.period)}</span>} subtitle={`${m.days} giornate`} right={<span className="font-semibold">{formatNumber(m.average)}</span>} />
            ))}
          </List>
        </>
      )}
      {logs.length === 0 && <p className="px-1 opacity-60">Ancora nessun check-in.</p>}
    </Screen>
  )
}
