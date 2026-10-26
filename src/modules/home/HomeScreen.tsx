import { useMemo, useState } from 'react'
import { Donut } from '../../components/Donut'
import { Sheet } from '../../components/ui'
import type { Transaction, TransactionType } from '../../db/schema'
import { useChartColors } from '../../lib/chartColors'
import { toISODate } from '../../lib/dates'
import { dayLabel, formatEUR, formatEURShort } from '../../lib/format'
import { rangeFor, rangeLabel, shiftAnchor, type PeriodKind } from '../../lib/periods'
import { navigate } from '../../lib/router'
import { MonthlyBackup } from '../backup/MonthlyBackup'
import { accountBalance, categoryBreakdown, categoryColorSlots } from '../finance/calc'
import { useAccounts, useCategoryMap, useTransactions } from '../finance/queries'
import { TransactionForm } from '../finance/TransactionForm'

type Kind = PeriodKind | 'custom'
const KINDS: [Kind, string][] = [
  ['day', 'Giorno'],
  ['week', 'Settimana'],
  ['month', 'Mese'],
  ['year', 'Anno'],
  ['custom', 'Periodo'],
]

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
)
const ListIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
)

/** Schermata iniziale: saldo, spese o entrate del periodo in un grafico ad anello. */
export function HomeScreen() {
  const today = toISODate(new Date())
  const [type, setType] = useState<TransactionType>('expense')
  const [kind, setKind] = useState<Kind>('month')
  const [anchor, setAnchor] = useState(today)
  const [custom, setCustom] = useState({ from: `${today.slice(0, 7)}-01`, to: today })
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const txs = useTransactions()
  const accounts = useAccounts()
  const categories = useCategoryMap()
  const colors = useChartColors()

  const range = kind === 'custom' ? custom : rangeFor(kind, anchor)
  const balance = (accounts ?? []).reduce((s, a) => s + accountBalance(a.openingBalance, a.id, txs ?? [], today), 0)
  const slots = useMemo(() => categoryColorSlots(txs ?? []), [txs])
  const breakdown = useMemo(() => categoryBreakdown(txs ?? [], type, range.from, range.to), [txs, type, range.from, range.to])
  const colorOf = (id: string) => {
    const s = slots.get(id) ?? -1
    return s >= 0 ? colors.slots[s] : colors.other
  }

  const segments = breakdown.rows.map((r) => ({
    id: r.categoryId,
    value: r.total,
    color: colorOf(r.categoryId),
    label: `${categories?.get(r.categoryId)?.name ?? 'Senza categoria'}: ${formatEUR(r.total)}`,
  }))

  const periodTxs = (categoryId: string) =>
    (txs ?? [])
      .filter((t) => t.type === type && (t.categoryId ?? '') === categoryId && t.date >= range.from && t.date <= range.to)
      .sort((a, b) => b.date.localeCompare(a.date))

  const move = (d: number) => kind !== 'custom' && setAnchor(shiftAnchor(kind, anchor, d))

  return (
    <div className="px-safe pt-safe pb-28">
      <header className="flex items-start justify-between pt-3">
        <button type="button" aria-label="Movimenti" className="flex h-11 w-11 items-center justify-center" onClick={() => navigate('/finance')}>
          <ListIcon />
        </button>
        <div className="text-center">
          <p className="text-sm opacity-65">Totale</p>
          <p className="text-3xl font-bold tabular-nums">{formatEURShort(balance)}</p>
        </div>
        <button type="button" aria-label="Grafici" className="flex h-11 w-11 items-center justify-center" onClick={() => navigate('/charts')}>
          <ChartIcon />
        </button>
      </header>

      <div className="mt-3 grid grid-cols-2 text-center font-semibold tracking-wide uppercase">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t)
              setSelected(null)
            }}
            className={`min-h-11 border-b-2 ${type === t ? 'border-current' : 'border-transparent opacity-50'}`}
          >
            {t === 'expense' ? 'Spese' : 'Entrate'}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <MonthlyBackup />

        <section className="rounded-3xl bg-white p-4 shadow-sm dark:bg-ox-900">
          <div className="flex justify-between gap-1 text-sm">
            {KINDS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k)
                  setSelected(null)
                }}
                className={`min-h-10 flex-1 border-b-2 whitespace-nowrap ${kind === k ? 'border-ochre font-semibold text-ochre-700 dark:text-ochre' : 'border-transparent opacity-60'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {kind === 'custom' ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input type="date" value={custom.from} aria-label="Dal" onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} className="rounded-xl bg-ox-900/6 px-3 py-2 text-base dark:bg-cream/10" />
              <input type="date" value={custom.to} aria-label="Al" onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })} className="rounded-xl bg-ox-900/6 px-3 py-2 text-base dark:bg-cream/10" />
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between">
              <button type="button" aria-label="Periodo precedente" onClick={() => move(-1)} className="h-11 w-11 text-2xl">‹</button>
              <span className="font-medium capitalize">{rangeLabel(kind, range)}</span>
              <button type="button" aria-label="Periodo successivo" onClick={() => move(1)} className="h-11 w-11 text-2xl">›</button>
            </div>
          )}

          <div className="mt-2">
            <Donut
              segments={segments}
              selectedId={selected}
              onSelect={setSelected}
              center={
                <>
                  <span className="text-3xl font-bold tabular-nums">{formatEURShort(selected ? breakdown.rows.find((r) => r.categoryId === selected)?.total ?? 0 : breakdown.total)}</span>
                  {selected && <span className="max-w-32 truncate text-sm opacity-65">{categories?.get(selected)?.name}</span>}
                </>
              }
            />
          </div>
        </section>

        {breakdown.rows.length === 0 && <p className="px-1 text-center opacity-60">Nessun movimento in questo periodo.</p>}

        {breakdown.rows.map((r) => {
          const c = categories?.get(r.categoryId)
          const open = selected === r.categoryId
          const tags = r.tags.filter((t) => t.tag)
          return (
            <div key={r.categoryId} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-ox-900">
              <button type="button" onClick={() => setSelected(open ? null : r.categoryId)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left" aria-expanded={open}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg" style={{ background: colorOf(r.categoryId) }} aria-hidden>
                  {c?.icon ?? '•'}
                </span>
                <span className="min-w-0 flex-1 truncate text-lg">{c?.name ?? 'Senza categoria'}</span>
                <span className="w-12 text-right tabular-nums opacity-65">{r.pct}%</span>
                <span className="w-24 text-right font-semibold tabular-nums">{formatEURShort(r.total)}</span>
                <span className={`text-sm opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>⌄</span>
              </button>
              {type === 'expense' && kind === 'month' && c?.monthlyBudget ? (
                <div className="-mt-1 flex items-center gap-2 px-3 pb-2 text-xs">
                  <div className="h-1.5 flex-1 rounded-full bg-ox-900/8 dark:bg-cream/10">
                    <div className={`h-1.5 rounded-full ${r.total > c.monthlyBudget ? 'bg-red-600' : 'bg-emerald-600'}`} style={{ width: `${Math.min(100, (r.total / c.monthlyBudget) * 100)}%` }} />
                  </div>
                  <span className={`tabular-nums ${r.total > c.monthlyBudget ? 'font-semibold text-red-700 dark:text-red-400' : 'opacity-60'}`}>
                    {r.total > c.monthlyBudget ? `sforato di ${formatEURShort(r.total - c.monthlyBudget)}` : `budget ${formatEURShort(c.monthlyBudget)}`}
                  </span>
                </div>
              ) : null}
              {open && (
                <div className="border-t border-ox-900/8 px-3 pb-2 dark:border-cream/10">
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 py-2">
                      {r.tags.map((t) => (
                        <span key={t.tag} className="rounded-full bg-ox-900/6 px-3 py-1 text-sm dark:bg-cream/10">
                          {t.tag ? `#${t.tag}` : 'senza tag'} · {formatEURShort(t.total)}
                        </span>
                      ))}
                    </div>
                  )}
                  {periodTxs(r.categoryId).map((t) => (
                    <button key={t.id} type="button" onClick={() => setEditing(t)} className="flex min-h-11 w-full items-center justify-between gap-2 py-1 text-left text-sm">
                      <span className="min-w-0 truncate">
                        <span className="opacity-60">{dayLabel(t.date)}</span> {[t.tags.map((x) => `#${x}`).join(' '), t.note].filter(Boolean).join(' · ')}
                      </span>
                      <span className="shrink-0 tabular-nums">{formatEUR(t.amount)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editing && (
        <Sheet title="Modifica movimento" onClose={() => setEditing(null)}>
          <TransactionForm initial={editing} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </div>
  )
}

