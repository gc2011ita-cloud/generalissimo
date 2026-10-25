import { useMemo, useState } from 'react'
import { BackButton, Button, Card, List, ListRow, Screen, SectionTitle, Sheet, Stat } from '../../components/ui'
import type { Transaction } from '../../db/schema'
import { toISODate } from '../../lib/dates'
import { addMonths, dayLabel, formatEUR, monthLabel } from '../../lib/format'
import { navigate, useLocation } from '../../lib/router'
import { accountBalance, sumBetween } from './calc'
import { useAccounts, useCategoryMap, useTransactions } from './queries'
import { TransactionForm } from './TransactionForm'

export function FinanceScreen() {
  const { query } = useLocation()
  const month = query.get('m') ?? toISODate(new Date()).slice(0, 7)
  const from = `${month}-01`
  const to = `${month}-31`
  const monthTxs = useTransactions(from, to)
  const allTxs = useTransactions()
  const accounts = useAccounts()
  const categories = useCategoryMap()
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null)

  const setMonth = (m: string) => navigate(`/finance?m=${m}`, { replace: true })

  const income = sumBetween(monthTxs ?? [], 'income', from, to)
  const expense = sumBetween(monthTxs ?? [], 'expense', from, to)
  const today = toISODate(new Date())
  const balance = (accounts ?? []).reduce((s, a) => s + accountBalance(a.openingBalance, a.id, allTxs ?? [], today), 0)

  const byDay = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of [...(monthTxs ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))) {
      map.set(t.date, [...(map.get(t.date) ?? []), t])
    }
    return [...map.entries()]
  }, [monthTxs])

  return (
    <Screen title="Finanze" back={<BackButton to="/more" label="Altro" />}>
      <Card>
        <Stat label="Saldo dei conti oggi" value={formatEUR(balance)} />
      </Card>

      <div className="flex items-center justify-between">
        <button type="button" aria-label="Mese precedente" onClick={() => setMonth(addMonths(month, -1))} className="min-h-11 min-w-11 text-2xl">
          ‹
        </button>
        <h2 className="text-lg font-bold capitalize">{monthLabel(month)}</h2>
        <button type="button" aria-label="Mese successivo" onClick={() => setMonth(addMonths(month, 1))} className="min-h-11 min-w-11 text-2xl">
          ›
        </button>
      </div>

      <Card className="grid grid-cols-3 gap-2">
        <Stat label="Entrate" value={formatEUR(income)} />
        <Stat label="Spese" value={formatEUR(expense)} />
        <Stat label="Risparmio" value={formatEUR(income - expense)} tone={income - expense >= 0 ? 'pos' : 'neg'} />
      </Card>

      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={() => setEditing('new')}>
          Aggiungi movimento
        </Button>
        <Button onClick={() => navigate(`/finance/stats?y=${month.slice(0, 4)}`)}>Analisi</Button>
      </div>

      {byDay.length === 0 && <p className="px-1 opacity-60">Nessun movimento in questo mese.</p>}
      {byDay.map(([day, txs]) => (
        <div key={day} className="space-y-2">
          <SectionTitle>{dayLabel(day)}</SectionTitle>
          <List>
            {txs.map((t) => {
              const c = t.categoryId ? categories?.get(t.categoryId) : undefined
              return (
                <ListRow
                  key={t.id}
                  onClick={() => setEditing(t)}
                  title={
                    <>
                      <span aria-hidden>{c?.icon ?? '•'}</span> {c?.name ?? 'Senza categoria'}
                    </>
                  }
                  subtitle={[t.tags.map((x) => `#${x}`).join(' '), t.note].filter(Boolean).join(' · ') || undefined}
                  right={
                    <span className={`font-semibold tabular-nums ${t.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                      {t.type === 'income' ? '+' : '−'}
                      {formatEUR(t.amount)}
                    </span>
                  }
                />
              )
            })}
          </List>
        </div>
      ))}

      {editing && (
        <Sheet title={editing === 'new' ? 'Nuovo movimento' : 'Modifica movimento'} onClose={() => setEditing(null)}>
          <TransactionForm initial={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </Screen>
  )
}
