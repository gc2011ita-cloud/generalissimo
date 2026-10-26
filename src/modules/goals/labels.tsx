import type { GoalStatus } from '../../db/schema'

// Stato sempre con testo e simbolo, mai solo colore.
export const STATUS_LABEL: Record<GoalStatus, { text: string; icon: string; cls: string }> = {
  achieved: { text: 'Raggiunto', icon: '✓', cls: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300' },
  onTrack: { text: 'In linea', icon: '●', cls: 'bg-emerald-600/10 text-emerald-800 dark:text-emerald-300' },
  behind: { text: 'In ritardo', icon: '▲', cls: 'bg-amber-500/20 text-amber-900 dark:text-amber-300' },
  atRisk: { text: 'A rischio', icon: '!', cls: 'bg-red-600/15 text-red-800 dark:text-red-300' },
  stale: { text: 'Fermo', icon: '…', cls: 'bg-ox-900/10 dark:bg-cream/10' },
  missed: { text: 'Mancato', icon: '✕', cls: 'bg-red-600/15 text-red-800 dark:text-red-300' },
}

export function StatusPill({ status, text }: { status: GoalStatus; text?: string }) {
  const s = STATUS_LABEL[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {text ?? s.text}
    </span>
  )
}
