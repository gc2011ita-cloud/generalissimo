// Foglio "+": inserimento rapido da qualunque schermata (anche con /add?tipo=…).

import { useEffect, useState } from 'react'
import { Sheet } from '../../components/ui'
import { navigate } from '../../lib/router'
import { TransactionForm } from '../finance/TransactionForm'
import { BodyMetricForm } from '../gym/BodyMetricForm'

export const QUICK_ADD_ITEMS = [
  { tipo: 'spesa', label: 'Spesa', emoji: '💶', ready: true },
  { tipo: 'entrata', label: 'Entrata', emoji: '💼', ready: true },
  { tipo: 'allenamento', label: 'Allenamento', emoji: '🏋️', ready: true },
  { tipo: 'peso', label: 'Peso', emoji: '⚖️', ready: true },
  { tipo: 'nota', label: 'Nota da studiare', emoji: '📚', ready: false },
  { tipo: 'obiettivo', label: 'Aggiorna obiettivo', emoji: '🎯', ready: false },
  { tipo: 'task', label: 'Task', emoji: '✅', ready: false },
] as const

export function QuickAddSheet({ open, tipo, onClose }: { open: boolean; tipo: string | null; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(tipo)
  useEffect(() => setSelected(tipo), [tipo, open])

  // L'allenamento si avvia dalla schermata Palestra (scelta della scheda).
  useEffect(() => {
    if (open && selected === 'allenamento') {
      setSelected(null)
      onClose()
      navigate('/gym')
    }
  }, [open, selected, onClose])

  if (!open || selected === 'allenamento') return null

  const close = () => {
    setSelected(null)
    onClose()
  }

  if (selected === 'spesa' || selected === 'entrata') {
    return (
      <Sheet title={selected === 'spesa' ? 'Nuova spesa' : 'Nuova entrata'} onClose={close}>
        <TransactionForm defaultType={selected === 'spesa' ? 'expense' : 'income'} onDone={close} />
      </Sheet>
    )
  }

  if (selected === 'peso') {
    return (
      <Sheet title="Peso" onClose={close}>
        <BodyMetricForm onDone={close} />
      </Sheet>
    )
  }

  return (
    <Sheet title="Aggiungi" onClose={close}>
      <div className="grid grid-cols-3 gap-3">
        {QUICK_ADD_ITEMS.map((item) => (
          <button
            key={item.tipo}
            type="button"
            disabled={!item.ready}
            onClick={() => setSelected(item.tipo)}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center text-sm font-medium active:scale-95 disabled:opacity-40 dark:bg-ox-800"
          >
            <span className="text-2xl" aria-hidden>
              {item.emoji}
            </span>
            {item.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-ox-700 dark:text-cream/60">Nota, obiettivi e task arrivano con la Fase 2.</p>
    </Sheet>
  )
}
