import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Button, Chip, DecimalInput, Field, Segmented, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord, softDelete, undoDelete, updateRecord } from '../../db/repo'
import type { Transaction, TransactionType } from '../../db/schema'
import { toISODate } from '../../lib/dates'
import { formatEUR, parseDecimal } from '../../lib/format'
import { showToast } from '../../lib/toast'
import { categoriesByRecentUse, normalizeTag, tagUsage } from './calc'
import { useAccounts, useCategories, useRecentTransactions } from './queries'

const TYPE_OPTIONS = [
  ['expense', 'Spesa'],
  ['income', 'Entrata'],
] as const

/** Inserimento e modifica di un movimento: importo, categoria, e il resto già compilato. */
export function TransactionForm({
  initial,
  defaultType = 'expense',
  onDone,
}: {
  initial?: Transaction
  defaultType?: TransactionType
  onDone: () => void
}) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? defaultType)
  const [amount, setAmount] = useState(initial ? String(initial.amount).replace('.', ',') : '')
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null)
  const [date, setDate] = useState(initial?.date ?? toISODate(new Date()))
  const [accountId, setAccountId] = useState<string | null>(initial?.accountId ?? null)
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [newTag, setNewTag] = useState('')
  const [note, setNote] = useState(initial?.note ?? '')
  const [professional, setProfessional] = useState(initial?.scope === 'professional')
  const [more, setMore] = useState(!!initial)

  const categories = useCategories(type)
  const accounts = useAccounts()
  const recent = useRecentTransactions(type)
  const allTags = useLiveQuery(async () => tagUsage(await db.transactions.where('type').equals(type).toArray()), [type])

  const visibleCategories = useMemo(() => {
    const list = (categories ?? []).filter((c) => !c.hidden || c.id === categoryId)
    return categoriesByRecentUse(list, recent ?? [])
  }, [categories, recent, categoryId])

  const parsed = parseDecimal(amount)
  const effectiveAccount = accountId ?? accounts?.[0]?.id ?? null
  const canSave = parsed !== null && parsed > 0 && !!categoryId

  const changeType = (t: TransactionType) => {
    setType(t)
    setCategoryId(null)
    setTags([])
  }

  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  const addTag = () => {
    const t = normalizeTag(newTag)
    if (t && !tags.includes(t)) setTags([...tags, t])
    setNewTag('')
  }

  const save = async () => {
    if (!canSave) return
    const data = {
      type,
      amount: parsed!,
      categoryId,
      date,
      accountId: effectiveAccount,
      tags,
      note: note.trim(),
      scope: professional ? ('professional' as const) : ('personal' as const),
    }
    if (initial) await updateRecord(db.transactions, initial.id, data)
    else await createRecord(db.transactions, { ...data, recurringId: null })
    showToast(`${type === 'expense' ? 'Spesa' : 'Entrata'} di ${formatEUR(parsed!)} salvata`)
    onDone()
  }

  const remove = async () => {
    if (!initial) return
    await softDelete(db.transactions, initial.id)
    showToast('Movimento eliminato', () => undoDelete(db.transactions, initial.id))
    onDone()
  }

  const suggestedTags = (allTags ?? []).filter((t) => !tags.includes(t)).slice(0, 10)

  return (
    <div className="space-y-4">
      <Segmented value={type} options={TYPE_OPTIONS} onChange={changeType} />

      <DecimalInput
        value={amount}
        onChange={setAmount}
        placeholder="0,00 €"
        aria-label="Importo"
        autoFocus={!initial}
        className="text-center text-3xl font-bold tabular-nums"
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Categoria">
        {visibleCategories.map((c) => (
          <Chip key={c.id} selected={c.id === categoryId} onClick={() => setCategoryId(c.id)}>
            <span aria-hidden>{c.icon}</span> {c.name}
          </Chip>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Chip key={t} selected onClick={() => toggleTag(t)}>
              #{t} ✕
            </Chip>
          ))}
        </div>
      )}

      {!more ? (
        <button type="button" onClick={() => setMore(true)} className="min-h-11 text-sm font-medium text-ochre-700 dark:text-ochre">
          Data, tag, nota…
        </button>
      ) : (
        <div className="space-y-3">
          <Field label="Data">
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10"
            />
          </Field>
          {accounts && accounts.length > 1 && (
            <Field label="Conto">
              <select
                value={effectiveAccount ?? ''}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Tag">
            <div className="mb-2 flex flex-wrap gap-2">
              {suggestedTags.map((t) => (
                <Chip key={t} onClick={() => toggleTag(t)}>
                  #{t}
                </Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <TextInput value={newTag} onChange={setNewTag} placeholder="Nuovo tag" enterKeyHint="done" onKeyDown={(e) => e.key === 'Enter' && addTag()} />
              <Button onClick={addTag} disabled={!newTag.trim()}>
                Aggiungi
              </Button>
            </div>
          </Field>
          <Field label="Nota">
            <TextInput value={note} onChange={setNote} />
          </Field>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={professional} onChange={(e) => setProfessional(e.target.checked)} className="h-5 w-5" />
            Professionale
          </label>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="primary" onClick={save} disabled={!canSave} className="flex-1">
          Salva
        </Button>
        {initial && (
          <Button variant="danger" onClick={remove}>
            Elimina
          </Button>
        )}
      </div>
    </div>
  )
}
