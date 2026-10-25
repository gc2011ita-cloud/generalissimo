import { useState } from 'react'
import { Button, Chip, DecimalInput, Field, List, ListRow, Segmented, Sheet, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord, softDelete, undoDelete, updateRecord } from '../../db/repo'
import { saveSettings } from '../../db/settings'
import type { Account, AccountType, Category, CheckInQuestion, TransactionType } from '../../db/schema'
import { formatEUR, parseDecimal } from '../../lib/format'
import { showToast } from '../../lib/toast'
import { questionId } from '../diary/calc'
import { useAccounts, useCategories } from '../finance/queries'

// --- Domande del check-in ---

export function CheckInQuestionsEditor({ questions }: { questions: CheckInQuestion[] }) {
  const [label, setLabel] = useState('')
  const save = (q: CheckInQuestion[]) => saveSettings({ checkInQuestions: q })
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= questions.length) return
    const copy = [...questions]
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    void save(copy)
  }
  const add = () => {
    const l = label.trim()
    if (!l) return
    void save([...questions, { id: questionId(l, questions.map((q) => q.id)), label: l, auto: null }])
    setLabel('')
  }
  const remove = (q: CheckInQuestion) => {
    const before = questions
    void save(questions.filter((x) => x.id !== q.id))
    showToast('Domanda tolta', () => save(before))
  }

  return (
    <div className="space-y-3">
      <List>
        {questions.map((q, i) => (
          <ListRow
            key={q.id}
            title={q.label}
            subtitle={q.auto === 'workout' ? 'Precompilata dagli allenamenti' : q.auto === 'study' ? 'Precompilata dallo studio' : undefined}
            right={
              <div className="flex">
                <button type="button" className="h-10 w-9" aria-label="Sposta su" onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="h-10 w-9" aria-label="Sposta giù" onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="h-10 w-9 text-red-600" aria-label="Togli" onClick={() => remove(q)}>✕</button>
              </div>
            }
          />
        ))}
      </List>
      <div className="flex gap-2">
        <TextInput value={label} onChange={setLabel} placeholder="Nuova domanda sì/no" />
        <Button onClick={add} disabled={!label.trim()}>
          Aggiungi
        </Button>
      </div>
    </div>
  )
}

// --- Categorie ---

export function CategoriesEditor() {
  const [type, setType] = useState<TransactionType>('expense')
  const categories = useCategories(type)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)

  const move = async (i: number, d: number) => {
    const list = categories ?? []
    const j = i + d
    if (j < 0 || j >= list.length) return
    const copy = [...list]
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    await Promise.all(copy.map((c, k) => (c.order !== k ? updateRecord(db.categories, c.id, { order: k }) : null)))
  }

  return (
    <div className="space-y-3">
      <Segmented value={type} options={[['expense', 'Spese'], ['income', 'Entrate']] as const} onChange={setType} />
      <List>
        {(categories ?? []).map((c, i) => (
          <ListRow
            key={c.id}
            title={`${c.icon} ${c.name}`}
            subtitle={[c.monthlyBudget ? `Budget ${formatEUR(c.monthlyBudget)}/mese` : null, c.hidden ? 'Nascosta nell’inserimento' : null].filter(Boolean).join(' · ') || undefined}
            onClick={() => setEditing(c)}
            right={
              <div className="flex" onClick={(e) => e.stopPropagation()}>
                <span role="button" tabIndex={0} className="flex h-10 w-9 items-center justify-center" aria-label="Sposta su" onClick={() => move(i, -1)}>↑</span>
                <span role="button" tabIndex={0} className="flex h-10 w-9 items-center justify-center" aria-label="Sposta giù" onClick={() => move(i, 1)}>↓</span>
              </div>
            }
          />
        ))}
      </List>
      <Button onClick={() => setEditing('new')}>Nuova categoria</Button>
      {editing && (
        <CategoryEditor
          category={editing === 'new' ? undefined : editing}
          type={type}
          nextOrder={categories?.length ?? 0}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function CategoryEditor({ category, type, nextOrder, onClose }: { category?: Category; type: TransactionType; nextOrder: number; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? '•')
  const [budget, setBudget] = useState(category?.monthlyBudget ? String(category.monthlyBudget).replace('.', ',') : '')
  const [hidden, setHidden] = useState(category?.hidden ?? false)
  const t = category?.type ?? type

  const save = async () => {
    const data = { name: name.trim() || 'Categoria', icon: icon.trim() || '•', monthlyBudget: t === 'expense' ? parseDecimal(budget) : null, hidden }
    if (category) await updateRecord(db.categories, category.id, data)
    else await createRecord(db.categories, { ...data, type: t, order: nextOrder })
    onClose()
  }
  const remove = async () => {
    if (!category) return
    await softDelete(db.categories, category.id)
    showToast('Categoria eliminata (i movimenti restano)', () => undoDelete(db.categories, category.id))
    onClose()
  }

  return (
    <Sheet title={category ? 'Modifica categoria' : 'Nuova categoria'} onClose={onClose}>
      <div className="grid grid-cols-[4.5rem_1fr] gap-3">
        <Field label="Icona"><TextInput value={icon} onChange={setIcon} className="text-center" /></Field>
        <Field label="Nome"><TextInput value={name} onChange={setName} /></Field>
      </div>
      {t === 'expense' && (
        <Field label="Budget mensile (€)" hint="Gli avvisi di sforamento arrivano con la Fase 2.">
          <DecimalInput value={budget} onChange={setBudget} placeholder="Nessuno" />
        </Field>
      )}
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="h-5 w-5" />
        Nascondi nell'inserimento (resta nei grafici)
      </label>
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={save}>Salva</Button>
        {category && <Button variant="danger" onClick={remove}>Elimina</Button>}
      </div>
    </Sheet>
  )
}

// --- Conti ---

const ACCOUNT_TYPES = [
  ['bank', 'Conto'],
  ['card', 'Carta'],
  ['cash', 'Contanti'],
] as const

export function AccountsEditor() {
  const accounts = useAccounts()
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  return (
    <div className="space-y-3">
      <List>
        {(accounts ?? []).map((a) => (
          <ListRow
            key={a.id}
            title={a.name}
            subtitle={`${ACCOUNT_TYPES.find(([t]) => t === a.type)?.[1]} · saldo iniziale ${formatEUR(a.openingBalance)}`}
            right="›"
            onClick={() => setEditing(a)}
          />
        ))}
      </List>
      <Button onClick={() => setEditing('new')}>Nuovo conto o carta</Button>
      {editing && <AccountEditor account={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function AccountEditor({ account, onClose }: { account?: Account; onClose: () => void }) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'card')
  const [opening, setOpening] = useState(account ? String(account.openingBalance).replace('.', ',') : '0')
  const save = async () => {
    const data = { name: name.trim() || 'Conto', type, openingBalance: parseDecimal(opening) ?? 0 }
    if (account) await updateRecord(db.accounts, account.id, data)
    else await createRecord(db.accounts, data)
    onClose()
  }
  return (
    <Sheet title={account ? 'Modifica conto' : 'Nuovo conto'} onClose={onClose}>
      <Field label="Nome"><TextInput value={name} onChange={setName} placeholder="Es. Carta Visa" /></Field>
      <Segmented value={type} options={ACCOUNT_TYPES} onChange={setType} />
      <Field label="Saldo iniziale (€)" hint="Il saldo prima del primo movimento registrato.">
        <DecimalInput value={opening} onChange={setOpening} />
      </Field>
      <Button variant="primary" className="w-full" onClick={save}>Salva</Button>
    </Sheet>
  )
}

// --- Palestra ---

export function GymSettings({ progressionKg, defaultRestSeconds }: { progressionKg: number; defaultRestSeconds: number }) {
  return (
    <div className="space-y-3">
      <Field label="Incremento suggerito">
        <div className="flex flex-wrap gap-2">
          {[1, 1.25, 2.5, 5].map((kg) => (
            <Chip key={kg} selected={kg === progressionKg} onClick={() => saveSettings({ progressionKg: kg })}>
              +{String(kg).replace('.', ',')} kg
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Recupero negli allenamenti liberi">
        <div className="flex flex-wrap gap-2">
          {[60, 90, 120, 180].map((s) => (
            <Chip key={s} selected={s === defaultRestSeconds} onClick={() => saveSettings({ defaultRestSeconds: s })}>
              {s >= 120 ? `${s / 60} min` : `${s} s`}
            </Chip>
          ))}
        </div>
      </Field>
    </div>
  )
}
