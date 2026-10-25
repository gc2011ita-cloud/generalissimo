import { useState } from 'react'
import { BackButton, Button, Card, Chip, DecimalInput, Field, List, ListRow, Screen, SectionTitle, Sheet, TextInput } from '../../components/ui'
import { db } from '../../db/db'
import { createRecord, softDelete, undoDelete, updateRecord } from '../../db/repo'
import type { Holding, HoldingValue } from '../../db/schema'
import { toISODate } from '../../lib/dates'
import { dayLabel, formatEUR, formatEURShort, formatNumber, parseDecimal } from '../../lib/format'
import { showToast } from '../../lib/toast'
import { latestByHolding, portfolioSummary } from './calc'
import { PortfolioChart } from './PortfolioChart'
import { usePortfolio } from './queries'

export const ASSET_CLASSES = ['ETF azionario', 'ETF obbligazionario', 'Azioni', 'Obbligazioni e BTP', 'Conto deposito', 'Fondo pensione', 'Crypto', 'Altro']

const str = (n: number | undefined) => (n == null ? '' : String(n).replace('.', ','))

export function InvestmentsScreen() {
  const p = usePortfolio()
  const [editing, setEditing] = useState<Holding | 'new' | null>(null)
  if (!p) return null
  const s = portfolioSummary(p.ids, p.values)
  const byId = new Map(p.holdings.map((h) => [h.id, h]))
  const open = s.rows.filter((r) => !r.closed)
  const closed = s.rows.filter((r) => r.closed)
  const empty = p.holdings.filter((h) => !s.rows.some((r) => r.holdingId === h.id))

  const row = (r: (typeof s.rows)[number]) => {
    const h = byId.get(r.holdingId)!
    return (
      <ListRow
        key={r.holdingId}
        onClick={() => setEditing(h)}
        title={h.name}
        subtitle={`${h.assetClass || 'Posizione'} · agg. ${dayLabel(r.date)}`}
        right={
          <>
            <div className="font-semibold tabular-nums">{formatEURShort(r.value)}</div>
            <div className={`text-xs tabular-nums ${r.gain >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {r.gain >= 0 ? '+' : ''}
              {formatEURShort(r.gain)}
              {r.gainPct != null && ` · ${formatNumber(r.gainPct)}%`}
            </div>
          </>
        }
      />
    )
  }

  return (
    <Screen title="Investimenti" back={<BackButton to="/more" label="Altro" />}>
      <p className="-mt-2 text-sm opacity-65">Separati da entrate e spese: aggiorni tu il valore quando vuoi.</p>
      <Card>
        <PortfolioChart />
      </Card>
      <Button variant="primary" onClick={() => setEditing('new')}>
        Nuova posizione
      </Button>
      {open.length > 0 && (
        <>
          <SectionTitle>Posizioni</SectionTitle>
          <List>{open.map(row)}</List>
        </>
      )}
      {empty.length > 0 && (
        <List>
          {empty.map((h) => (
            <ListRow key={h.id} title={h.name} subtitle="Nessun valore inserito" right="›" onClick={() => setEditing(h)} />
          ))}
        </List>
      )}
      {closed.length > 0 && (
        <>
          <SectionTitle>Chiuse</SectionTitle>
          <List>{closed.map(row)}</List>
        </>
      )}
      {editing && (
        <HoldingSheet
          holding={editing === 'new' ? undefined : editing}
          history={editing === 'new' ? [] : p.values.filter((v) => v.holdingId === editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </Screen>
  )
}

function HoldingSheet({ holding, history: values, onClose }: { holding?: Holding; history: HoldingValue[]; onClose: () => void }) {
  // I valori arrivano già caricati dalla schermata: così "Versato" è precompilato subito.
  const history = [...values].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
  const last = holding ? latestByHolding(history).get(holding.id) : undefined

  const [name, setName] = useState(holding?.name ?? '')
  const [assetClass, setAssetClass] = useState(holding?.assetClass || ASSET_CLASSES[0])
  const [ticker, setTicker] = useState(holding?.ticker ?? '')
  const [value, setValue] = useState('')
  const [invested, setInvested] = useState(str(last?.invested))
  const [date, setDate] = useState(toISODate(new Date()))
  const [note, setNote] = useState('')
  const [editInfo, setEditInfo] = useState(!holding)

  const v = parseDecimal(value)
  const inv = parseDecimal(invested)
  const canSave = (!!holding || name.trim().length > 0) && v !== null && inv !== null

  const save = async () => {
    let id = holding?.id
    const info = { name: name.trim() || holding?.name || 'Posizione', assetClass, ticker: ticker.trim().toUpperCase() }
    if (holding) {
      if (editInfo) await updateRecord(db.holdings, holding.id, info)
    } else {
      const h = await createRecord(db.holdings, { ...info, groupId: null, isin: '', exchange: '', currency: 'EUR', quantity: 0, avgPrice: 0 })
      id = h.id
    }
    await createRecord(db.holdingValues, { holdingId: id!, date, invested: inv!, value: v!, note: note.trim() })
    showToast('Posizione aggiornata')
    onClose()
  }

  const saveInfoOnly = async () => {
    if (!holding) return
    await updateRecord(db.holdings, holding.id, { name: name.trim() || holding.name, assetClass, ticker: ticker.trim().toUpperCase() })
    onClose()
  }

  const closePosition = async () => {
    if (!holding) return
    await createRecord(db.holdingValues, { holdingId: holding.id, date: toISODate(new Date()), invested: 0, value: 0, note: 'Posizione chiusa' })
    showToast('Posizione chiusa')
    onClose()
  }

  const remove = async () => {
    if (!holding) return
    await softDelete(db.holdings, holding.id)
    showToast('Posizione eliminata', () => undoDelete(db.holdings, holding.id))
    onClose()
  }

  return (
    <Sheet title={holding ? holding.name : 'Nuova posizione'} onClose={onClose}>
      {editInfo ? (
        <div className="space-y-3">
          <Field label="Nome">
            <TextInput value={name} onChange={setName} placeholder="Es. MSCI World, BTP 2030, Conto deposito" />
          </Field>
          <Field label="Tipo" group>
            <div className="flex flex-wrap gap-2">
              {ASSET_CLASSES.map((a) => (
                <Chip key={a} selected={a === assetClass} onClick={() => setAssetClass(a)}>
                  {a}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Ticker o ISIN (facoltativo)" hint="Servirà per l'aggiornamento automatico dei prezzi (Fase 3).">
            <TextInput value={ticker} onChange={setTicker} placeholder="Es. SWDA.MI" autoCapitalize="characters" />
          </Field>
        </div>
      ) : (
        <button type="button" className="min-h-11 text-sm font-medium text-ochre-700 dark:text-ochre" onClick={() => setEditInfo(true)}>
          Modifica nome e tipo
        </button>
      )}

      <Card className="space-y-3">
        <h3 className="font-semibold">{holding ? 'Aggiorna valore' : 'Valore di oggi'}</h3>
        {last && (
          <p className="text-sm opacity-65">
            Ultimo: {formatEUR(last.value)} su {formatEUR(last.invested)} versati ({dayLabel(last.date)})
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valore attuale (€)">
            <DecimalInput value={value} onChange={setValue} autoFocus={!!holding} />
          </Field>
          <Field label="Versato in tutto (€)">
            <DecimalInput value={invested} onChange={setInvested} />
          </Field>
          <Field label="Data">
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base dark:bg-cream/10" />
          </Field>
          <Field label="Nota">
            <TextInput value={note} onChange={setNote} />
          </Field>
        </div>
        <Button variant="primary" className="w-full" onClick={save} disabled={!canSave}>
          Salva
        </Button>
        {holding && editInfo && (
          <Button className="w-full" onClick={saveInfoOnly}>
            Salva solo nome e tipo
          </Button>
        )}
      </Card>

      {history.length > 0 && (
        <>
          <SectionTitle>Storico aggiornamenti</SectionTitle>
          <List>
            {history.map((h) => (
              <ListRow
                key={h.id}
                title={`${formatEUR(h.value)} · versato ${formatEUR(h.invested)}`}
                subtitle={[dayLabel(h.date), h.note].filter(Boolean).join(' · ')}
                right={
                  <button
                    type="button"
                    aria-label="Elimina aggiornamento"
                    className="min-h-11 px-2 opacity-60"
                    onClick={async () => {
                      await softDelete(db.holdingValues, h.id)
                      showToast('Aggiornamento eliminato', () => undoDelete(db.holdingValues, h.id))
                    }}
                  >
                    ✕
                  </button>
                }
              />
            ))}
          </List>
        </>
      )}

      {holding && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={closePosition}>
            Chiudi posizione
          </Button>
          <Button variant="danger" onClick={remove}>
            Elimina
          </Button>
        </div>
      )}
    </Sheet>
  )
}
