import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Stat } from '../../components/ui'
import { useChartColors } from '../../lib/chartColors'
import { parseISODate } from '../../lib/dates'
import { formatEUR, formatEURShort, formatNumber } from '../../lib/format'
import { portfolioSeries, portfolioSummary } from './calc'
import { usePortfolio } from './queries'

/** Valore delle posizioni nel tempo, con il capitale versato come riferimento. */
export function PortfolioChart() {
  const p = usePortfolio()
  const colors = useChartColors()
  const series = useMemo(
    () =>
      p
        ? portfolioSeries(p.ids, p.values).map((x) => ({ ...x, t: parseISODate(x.date).getTime() }))
        : [],
    [p],
  )
  if (!p) return null
  const s = portfolioSummary(p.ids, p.values)
  if (!series.length) return <p className="text-sm opacity-65">Nessuna posizione inserita.</p>

  const axis = { stroke: colors.text, fontSize: 11, tickLine: false, axisLine: false } as const
  return (
    <>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="Valore" value={formatEURShort(s.value)} />
        <Stat label="Versato" value={formatEURShort(s.invested)} />
        <Stat
          label="Guadagno"
          value={`${s.gain >= 0 ? '+' : ''}${formatEURShort(s.gain)}${s.gainPct != null ? ` (${formatNumber(s.gainPct)}%)` : ''}`}
          tone={s.gain >= 0 ? 'pos' : 'neg'}
        />
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <AreaChart data={series}>
            <defs>
              <linearGradient id="portafoglio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.s1} stopOpacity={0.35} />
                <stop offset="100%" stopColor={colors.s1} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            {/* asse temporale vero: gli aggiornamenti non sono a intervalli regolari */}
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              {...axis}
              minTickGap={28}
              tickFormatter={(t) => new Date(t).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })}
            />
            <YAxis {...axis} width={50} tickFormatter={(v) => formatEURShort(v)} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: colors.surface, border: 'none', borderRadius: 12, color: colors.text }}
              labelFormatter={(t) => new Date(Number(t)).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              formatter={(v, name) => [formatEUR(Number(v)), name === 'value' ? 'Valore' : 'Versato']}
            />
            <Area dataKey="value" name="value" stroke={colors.s1} strokeWidth={2} fill="url(#portafoglio)" dot={series.length < 25 ? { r: 4 } : false} isAnimationActive={false} />
            <Line dataKey="invested" name="invested" stroke={colors.text} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colors.s1 }} /> valore
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: colors.text }} /> versato
        </span>
      </div>
    </>
  )
}
