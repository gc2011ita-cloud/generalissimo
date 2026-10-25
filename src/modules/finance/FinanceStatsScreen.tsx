import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BackButton, Card, List, ListRow, Screen, Segmented, SectionTitle } from '../../components/ui'
import { useChartColors } from '../../lib/chartColors'
import { formatEUR, formatEURShort, monthLabel } from '../../lib/format'
import { navigate, useLocation } from '../../lib/router'
import { monthlySummaries, totalsBy } from './calc'
import { useCategoryMap, useTransactions } from './queries'

const RANGE_OPTIONS = [
  ['year', 'Anno'],
  ['all', 'Tutto'],
] as const

export function FinanceStatsScreen() {
  const { query } = useLocation()
  const year = query.get('y') ?? String(new Date().getFullYear())
  const [range, setRange] = useState<'year' | 'all'>('year')
  const txs = useTransactions()
  const categories = useCategoryMap()
  const colors = useChartColors()

  const summaries = useMemo(() => monthlySummaries(txs ?? []), [txs])
  const shown = range === 'year' ? summaries.filter((s) => s.month.startsWith(year)) : summaries
  const years = [...new Set(summaries.map((s) => s.month.slice(0, 4)))]
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const byCategory = totalsBy(txs ?? [], 'expense', 'category', from, to)
  const byTag = totalsBy(txs ?? [], 'income', 'tag', from, to)
  const totalExpense = byCategory.reduce((s, x) => s + x.total, 0)
  const totalIncome = byTag.reduce((s, x) => s + x.total, 0)
  const data = shown.map((s) => ({ ...s, label: monthLabel(s.month, true) }))

  const axis = { stroke: colors.text, fontSize: 11, tickLine: false, axisLine: false }
  const tooltip = {
    formatter: (v: unknown) => formatEUR(Number(v)),
    contentStyle: { background: colors.surface, border: 'none', borderRadius: 12, color: colors.text },
  }

  return (
    <Screen title="Analisi" back={<BackButton to="/finance" label="Finanze" />}>
      <div className="flex flex-wrap gap-2">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => navigate(`/finance/stats?y=${y}`, { replace: true })}
            className={`min-h-10 rounded-full px-3 text-sm font-semibold ${y === year ? 'bg-ox-900 text-cream dark:bg-ochre dark:text-ox-950' : 'bg-ox-900/8 dark:bg-cream/10'}`}
          >
            {y}
          </button>
        ))}
      </div>
      <Segmented value={range} options={RANGE_OPTIONS} onChange={setRange} />

      <SectionTitle>Entrate e spese per mese</SectionTitle>
      <Card>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={data} barGap={2}>
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
              <YAxis {...axis} width={48} tickFormatter={(v) => formatEURShort(v)} />
              <Tooltip {...tooltip} cursor={{ fill: colors.grid, opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: colors.text }} />
              <Bar dataKey="income" name="Entrate" fill={colors.s1} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Spese" fill={colors.s2} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle>Risparmio del mese</SectionTitle>
      <Card>
        <div className="h-48">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
              <YAxis {...axis} width={48} tickFormatter={(v) => formatEURShort(v)} />
              <Tooltip {...tooltip} cursor={{ fill: colors.grid, opacity: 0.4 }} />
              <Bar dataKey="net" name="Risparmio" radius={[4, 4, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.month} fill={d.net >= 0 ? colors.s1 : colors.s2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle>Risparmio cumulato</SectionTitle>
      <Card>
        <div className="h-48">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
              <YAxis {...axis} width={48} tickFormatter={(v) => formatEURShort(v)} />
              <Tooltip {...tooltip} />
              <Line dataKey="cumulative" name="Cumulato" stroke={colors.s1} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <List>
        {[...shown].reverse().map((s) => (
          <ListRow
            key={s.month}
            onClick={() => navigate(`/finance?m=${s.month}`)}
            title={<span className="capitalize">{monthLabel(s.month)}</span>}
            subtitle={`Cumulato ${formatEUR(s.cumulative)}`}
            right={<span className={`font-semibold tabular-nums ${s.net < 0 ? 'text-red-700 dark:text-red-400' : ''}`}>{formatEUR(s.net)}</span>}
          />
        ))}
      </List>

      <SectionTitle>Spese {year} per categoria</SectionTitle>
      <List>
        {byCategory.map((x) => {
          const c = categories?.get(x.key)
          const pct = totalExpense ? Math.round((x.total / totalExpense) * 100) : 0
          return (
            <ListRow
              key={x.key}
              title={`${c?.icon ?? '•'} ${c?.name ?? 'Senza categoria'}`}
              subtitle={
                <span className="mt-1 block h-1.5 rounded-full bg-ox-900/8 dark:bg-cream/10">
                  <span className="block h-1.5 rounded-full" style={{ width: `${pct}%`, background: colors.s2 }} />
                </span>
              }
              right={
                <>
                  <div className="font-semibold tabular-nums">{formatEUR(x.total)}</div>
                  <div className="text-xs opacity-60">{pct}%</div>
                </>
              }
            />
          )
        })}
      </List>

      <SectionTitle>Entrate {year} per tag</SectionTitle>
      <List>
        {byTag.map((x) => (
          <ListRow
            key={x.key}
            title={x.key ? `#${x.key}` : 'Senza tag'}
            right={
              <>
                <div className="font-semibold tabular-nums">{formatEUR(x.total)}</div>
                <div className="text-xs opacity-60">{totalIncome ? Math.round((x.total / totalIncome) * 100) : 0}%</div>
              </>
            }
          />
        ))}
      </List>
    </Screen>
  )
}
