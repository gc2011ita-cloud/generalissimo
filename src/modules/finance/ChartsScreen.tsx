import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BackButton, Card, List, ListRow, Screen, SectionTitle, Stat } from '../../components/ui'
import { useChartColors } from '../../lib/chartColors'
import { parseISODate, toISODate } from '../../lib/dates'
import { formatEUR, formatEURShort, monthLabel } from '../../lib/format'
import { periodStarts, rangeFor, shiftAnchor, type PeriodKind } from '../../lib/periods'
import { monthlySummaries, periodSeries } from './calc'
import { useTransactions } from './queries'

const KINDS: [PeriodKind, string, number][] = [
  ['year', 'anno', 0],
  ['month', 'mese', 6],
  ['week', 'settimana', 6],
  ['day', 'giorno', 7],
]

function shortLabel(kind: PeriodKind, start: string) {
  const d = parseISODate(start)
  if (kind === 'year') return start.slice(0, 4)
  if (kind === 'month') return d.toLocaleDateString('it-IT', { month: 'short' })
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: kind === 'week' ? 'short' : undefined, weekday: kind === 'day' ? 'short' : undefined })
}

function longLabel(kind: PeriodKind, start: string) {
  if (kind === 'year') return start.slice(0, 4)
  if (kind === 'month') return monthLabel(start.slice(0, 7))
  const r = rangeFor(kind, start)
  const f = (s: string) => parseISODate(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  return kind === 'week' ? `${f(r.from)} – ${f(r.to)}` : f(start)
}

/** Grafici a colonne di entrate, spese e guadagni, e progressione del risparmio. */
export function ChartsScreen() {
  const today = toISODate(new Date())
  const [kind, setKind] = useState<PeriodKind>('month')
  const [anchor, setAnchor] = useState(today)
  const txs = useTransactions()
  const colors = useChartColors()

  const count = KINDS.find(([k]) => k === kind)![2]
  const firstDate = useMemo(() => (txs ?? []).reduce((m, t) => (t.date < m ? t.date : m), today), [txs, today])

  const starts = useMemo(() => {
    if (kind === 'year') return periodStarts('year', firstDate, today)
    const last = rangeFor(kind, anchor).from
    return periodStarts(kind, shiftAnchor(kind, last, -(count - 1)), last)
  }, [kind, anchor, count, firstDate, today])

  const data = useMemo(
    () =>
      periodSeries(txs ?? [], starts, (d) => rangeFor(kind, d).from).map((p) => ({
        ...p,
        label: shortLabel(kind, p.start),
        netAbs: Math.abs(p.net),
      })),
    [txs, starts, kind],
  )
  const savings = useMemo(() => monthlySummaries(txs ?? []).map((s) => ({ ...s, label: monthLabel(s.month, true) })), [txs])
  const totalSaved = savings.at(-1)?.cumulative ?? 0
  const avg = savings.length ? totalSaved / savings.length : 0

  const axis = { stroke: colors.text, fontSize: 11, tickLine: false, axisLine: false } as const
  const tooltipStyle = { background: colors.surface, border: 'none', borderRadius: 12, color: colors.text }
  const canPage = kind !== 'year'

  return (
    <Screen title="Grafici" back={<BackButton to="/" label="Home" />}>
      <div className="flex justify-between gap-1 text-sm">
        {KINDS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k)
              setAnchor(today)
            }}
            className={`min-h-10 flex-1 border-b-2 whitespace-nowrap ${kind === k ? 'border-ochre font-semibold text-ochre-700 dark:text-ochre' : 'border-transparent opacity-60'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        {canPage && (
          <div className="mb-1 flex items-center justify-between">
            <button type="button" aria-label="Indietro" className="h-10 w-10 text-2xl" onClick={() => setAnchor(shiftAnchor(kind, anchor, -count))}>‹</button>
            <span className="text-sm opacity-70">
              {longLabel(kind, starts[0]).split(' – ')[0]} – {longLabel(kind, starts.at(-1)!).split(' – ').at(-1)}
            </span>
            <button type="button" aria-label="Avanti" className="h-10 w-10 text-2xl disabled:opacity-30" disabled={starts.at(-1)! >= rangeFor(kind, today).from} onClick={() => setAnchor(shiftAnchor(kind, anchor, count))}>›</button>
          </div>
        )}
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={data} barGap={2} barCategoryGap="18%">
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis dataKey="label" {...axis} interval={0} />
              <YAxis {...axis} width={50} tickFormatter={(v) => formatEURShort(v)} />
              <Tooltip
                cursor={{ fill: colors.grid, opacity: 0.4 }}
                contentStyle={tooltipStyle}
                formatter={(v, name, item) => {
                  if (name === 'net') {
                    const net = (item.payload as { net: number }).net
                    return [formatEUR(net), net >= 0 ? 'Guadagno' : 'Perdita']
                  }
                  return [formatEUR(Number(v)), name === 'income' ? 'Entrate' : 'Spese']
                }}
              />
              <Bar dataKey="income" name="income" fill={colors.income} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="expense" fill={colors.expense} radius={[4, 4, 0, 0]} />
              <Bar dataKey="netAbs" name="net" radius={[4, 4, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.start} fill={d.net >= 0 ? colors.gain : colors.loss} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          {[
            [colors.income, 'entrate'],
            [colors.expense, 'spese'],
            [colors.gain, 'guadagni'],
            [colors.loss, 'perdite'],
          ].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
      </Card>

      <List>
        {[...data].reverse().map((d) => (
          <ListRow
            key={d.start}
            title={<span className="capitalize">{longLabel(kind, d.start)}</span>}
            subtitle={`Entrate ${formatEURShort(d.income)} · Spese ${formatEURShort(d.expense)}`}
            right={
              <span className={`font-semibold tabular-nums ${d.net < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {d.net >= 0 ? '+' : ''}
                {formatEURShort(d.net)}
              </span>
            }
          />
        ))}
      </List>

      <SectionTitle>Progressione del risparmio</SectionTitle>
      <Card>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Stat label={`Risparmiato da ${savings[0] ? monthLabel(savings[0].month) : '–'}`} value={formatEURShort(totalSaved)} tone={totalSaved >= 0 ? 'pos' : 'neg'} />
          <Stat label="Media al mese" value={formatEURShort(avg)} />
        </div>
        <div className="h-56">
          <ResponsiveContainer>
            <AreaChart data={savings}>
              <defs>
                <linearGradient id="risparmio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.gain} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.gain} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...axis} width={50} tickFormatter={(v) => formatEURShort(v)} />
              <ReferenceLine y={0} stroke={colors.text} strokeOpacity={0.4} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, _n, item) => [formatEUR(Number(v)), `Cumulato (mese ${formatEUR((item.payload as { net: number }).net)})`]}
              />
              <Area dataKey="cumulative" stroke={colors.gain} strokeWidth={2} fill="url(#risparmio)" dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs opacity-60">Somma delle entrate meno le spese, mese dopo mese.</p>
      </Card>
    </Screen>
  )
}
