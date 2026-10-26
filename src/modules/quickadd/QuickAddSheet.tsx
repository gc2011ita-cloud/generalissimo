// Foglio "+": inserimento rapido da qualunque schermata (anche con /add?tipo=…).

import { useEffect, useState } from 'react'
import { Sheet } from '../../components/ui'
import { toISODate } from '../../lib/dates'
import { navigate } from '../../lib/router'
import { showToast } from '../../lib/toast'
import { TransactionForm } from '../finance/TransactionForm'
import { setSport } from '../sport/queries'

export const QUICK_ADD_ITEMS = [
  { tipo: 'spesa', label: 'Spesa', emoji: '💶' },
  { tipo: 'entrata', label: 'Entrata', emoji: '💼' },
  { tipo: 'sport', label: 'Sport fatto oggi', emoji: '🏃' },
  { tipo: 'studio', label: 'Progresso studio', emoji: '📚' },
] as const

export function QuickAddSheet({ open, tipo, onClose }: { open: boolean; tipo: string | null; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(tipo)
  useEffect(() => setSelected(tipo), [tipo, open])

  // Azioni immediate: sport segnato con un tocco, studio apre la sua schermata.
  useEffect(() => {
    if (!open || (selected !== 'sport' && selected !== 'studio')) return
    setSelected(null)
    onClose()
    if (selected === 'sport') {
      const today = toISODate(new Date())
      void setSport(today, true).then(() => showToast('Sport di oggi segnato', () => setSport(today, undefined)))
    } else navigate('/study')
  }, [open, selected, onClose])

  if (!open || selected === 'sport' || selected === 'studio') return null

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

  return (
    <Sheet title="Aggiungi" onClose={close}>
      <div className="grid grid-cols-2 gap-3">
        {QUICK_ADD_ITEMS.map((item) => (
          <button
            key={item.tipo}
            type="button"
            onClick={() => setSelected(item.tipo)}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-4 text-center font-medium active:scale-95 dark:bg-ox-800"
          >
            <span className="text-3xl" aria-hidden>
              {item.emoji}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
