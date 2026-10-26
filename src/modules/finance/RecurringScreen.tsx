import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { BackButton, Button, Chip, DecimalInput, Field, List, ListRow, Screen, Segmented, Sheet, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord, softDelete, undoDelete, updateRecord } from '../../db/repo'
import type { Recurring, RecurringFrequency, TransactionType } from '../../db/schema'
import { toISODate } from '../../lib/dates'
import { dayLabel, formatEUR, parseDecimal } from '../../lib/format'
import { showToast } from '../../lib/toast'
import { useAccounts, useCategories, useCategoryMap } from './queries'
import { runRecurring } from './recurringRunner'

const FREQ: Record<RecurringFrequency, string> = { monthly: 'Ogni mese', weekly: 'Ogni settimana', yearly: 'Ogni anno' }
const WEEKDAYS = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica']

export function RecurringScreen() {
  const list = useLiveQuery(async () => (await db.recurring.toArray()).filter((r) => r.deletedAt === null).sort((a, b) => a.name.localeCompare(b.name)))
  const categories = useCategoryMap()
  const [editing, setEditing] = useState<Recurring | 'new' | null>(null)

  return (
    <Screen title="Spese ricorrenti" back={<BackButton to="/more" label="Altro" />}>
      <p className="-mt-2 text-sm opacity-65">Affitto, abbonamenti, rate: il movimento si crea da solo alla scadenza, all'apertura dell'app.</p>
      <List>
        {(list ?? []).map((r) => (
          <ListRow
            key={r.id}
            onClick={() => setEditing(r)}
            title={`${categories?.get(r.categoryId ?? '')?.icon ?? '•'} ${r.name}`}
            subtitle={`${FREQ[r.frequency]} · ${r.frequency === 'weekly' ? WEEKDAYS[r.dayOfPeriod - 1] : `giorno ${r.dayOfPeriod}`}${r.active ? '' : ' · sospesa'}`}
            right={<span className={`font-semibold tabular-nums ${r.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>{formatEUR(r.amount)}</span>}
          />
        ))}
        {list?.length === 0 && <ListRow title="Nessuna spesa ricorrente" />}
      </List>
      <Button variant="primary" onClick={() => setEditing('new')}>Nuova ricorrente</Button>
      {editing && <RecurringEditor rec={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </Screen>
  )
}

function RecurringEditor({ rec, onClose }: { rec?: Recurring; onClose: () => void }) {
  const [type, setType] = useState<TransactionType>(rec?.type ?? 'expense')
  const [name, setName] = useState(rec?.name ?? '')
  const [amount, setAmount] = useState(rec ? String(rec.amount).replace('.', ',') : '')
  const [categoryId, setCategoryId] = useState<string | null>(rec?.categoryId ?? null)
  const [frequency, setFrequency] = useState<RecurringFrequency>(rec?.frequency ?? 'monthly')
  const [day, setDay] = useState(rec?.dayOfPeriod ?? new Date().getDate())
  const [startDate, setStartDate] = useState(rec?.startDate ?? toISODate(new Date()))
  const [endDate, setEndDate] = useState(rec?.endDate ?? '')
  const [active, setActive] = useState(rec?.active ?? true)
  const categories = useCategories(type)
  const accounts = useAccounts()
  const a = parseDecimal(amount)

  const save = async () => {
    const data = {
      name: name.trim() || 'Ricorrente', amount: a!, type, categoryId, accountId: rec?.accountId ?? accounts?.[0]?.id ?? null,
      scope: rec?.scope ?? ('personal' as const), frequency, dayOfPeriod: day, startDate, endDate: endDate || null, active,
    }
    if (rec) await updateRecord(db.recurring, rec.id, data)
    else await createRecord(db.recurring, { ...data, lastGenerated: null })
    const n = await runRecurring()
    showToast(n ? `Salvata · ${n} movimenti creati` : 'Spesa ricorrente salvata')
    onClose()
  }
  const remove = async () => {
    if (!rec) return
    await softDelete(db.recurring, rec.id)
    showToast('Ricorrente eliminata (i movimenti già creati restano)', () => undoDelete(db.recurring, rec.id))
    onClose()
  }

  return (
    <Sheet title={rec ? 'Modifica ricorrente' : 'Nuova ricorrente'} onClose={onClose}>
      <Segmented value={type} options={[['expense', 'Spesa'], ['income', 'Entrata']] as const} onChange={(t) => { setType(t); setCategoryId(null) }} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome"><TextInput value={name} onChange={setName} placeholder="Es. Affitto" /></Field>
        <Field label="Importo (€)"><DecimalInput value={amount} onChange={setAmount} /></Field>
      </div>
      <Field label="Categoria" group>
        <div className="flex flex-wrap gap-2">
          {(categories ?? []).filter((c) => !c.hidden || c.id === categoryId).map((c) => (
            <Chip key={c.id} selected={c.id === categoryId} onClick={() => setCategoryId(c.id)}>{c.icon} {c.name}</Chip>
          ))}
        </div>
      </Field>
      <Segmented value={frequency} options={[['monthly', 'Mensile'], ['weekly', 'Settimanale'], ['yearly', 'Annuale']] as const} onChange={(f) => { setFrequency(f); setDay(f === 'weekly' ? 1 : day > 7 ? day : 1) }} />
      {frequency === 'weekly' ? (
        <Field label="Giorno" group>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((w, i) => <Chip key={w} selected={day === i + 1} onClick={() => setDay(i + 1)}>{w.slice(0, 3)}</Chip>)}
          </div>
        </Field>
      ) : (
        <Field label={frequency === 'yearly' ? 'Giorno del mese (mese della data di inizio)' : 'Giorno del mese'} hint="31 = ultimo giorno del mese">
          <DecimalInput value={String(day)} onChange={(v) => setDay(Math.min(31, Math.max(1, Math.round(parseDecimal(v) ?? 1))))} inputMode="numeric" />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Dal"><input type="date" value={startDate} onChange={(e) => e.target.value && setStartDate(e.target.value)} className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10" /></Field>
        <Field label="Fino al (facoltativo)"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10" /></Field>
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5" /> Attiva
      </label>
      {rec?.lastGenerated && <p className="text-sm opacity-65">Ultimo movimento creato: {dayLabel(rec.lastGenerated)}</p>}
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={save} disabled={!a || !categoryId}>Salva</Button>
        {rec && <Button variant="danger" onClick={remove}>Elimina</Button>}
      </div>
    </Sheet>
  )
}
