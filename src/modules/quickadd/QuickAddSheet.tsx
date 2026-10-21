// Foglio "+": inserimento rapido da qualunque schermata. In Fase 0 le voci non sono ancora attive.

export const QUICK_ADD_ITEMS = [
  { tipo: 'spesa', label: 'Spesa', emoji: '💶' },
  { tipo: 'allenamento', label: 'Allenamento', emoji: '🏋️' },
  { tipo: 'nota', label: 'Nota da studiare', emoji: '📚' },
  { tipo: 'obiettivo', label: 'Aggiorna obiettivo', emoji: '🎯' },
  { tipo: 'peso', label: 'Peso', emoji: '⚖️' },
  { tipo: 'task', label: 'Task', emoji: '✅' },
] as const

export function QuickAddSheet({ open, tipo, onClose }: { open: boolean; tipo: string | null; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label="Aggiungi">
      <button type="button" aria-label="Chiudi" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="pb-safe absolute inset-x-0 bottom-0 rounded-t-3xl bg-paper px-4 pt-3 dark:bg-ox-900">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ox-900/20 dark:bg-cream/20" />
        <h2 className="mb-3 text-lg font-bold">Aggiungi</h2>
        <div className="grid grid-cols-3 gap-3 pb-4">
          {QUICK_ADD_ITEMS.map((item) => (
            <div
              key={item.tipo}
              aria-disabled
              className={`flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center text-sm font-medium opacity-60 dark:bg-ox-800 ${
                tipo === item.tipo ? 'ring-2 ring-ochre' : ''
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {item.emoji}
              </span>
              {item.label}
            </div>
          ))}
        </div>
        <p className="pb-4 text-sm text-ox-700 dark:text-cream/60">Gli inserimenti arrivano con la Fase 1.</p>
      </div>
    </div>
  )
}
