import { adjustRest, stopRest, useRestTimer } from './restTimer'

export function RestTimerBar() {
  const t = useRestTimer()
  if (!t) return null
  const m = Math.floor(t.remaining / 60)
  const s = String(t.remaining % 60).padStart(2, '0')
  const pct = t.total ? (t.remaining / t.total) * 100 : 0
  return (
    <div className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-lg overflow-hidden rounded-2xl bg-ox-900 text-cream shadow-lg" role="timer" aria-live="off">
      <div className="h-1 bg-ochre transition-[width] duration-300" style={{ width: `${pct}%` }} />
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <span className="text-sm">Recupero</span>
        <span className="text-2xl font-bold tabular-nums">
          {m}:{s}
        </span>
        <div className="flex gap-1">
          <button type="button" className="min-h-10 rounded-lg px-2 text-sm" onClick={() => adjustRest(-15)}>
            −15
          </button>
          <button type="button" className="min-h-10 rounded-lg px-2 text-sm" onClick={() => adjustRest(15)}>
            +15
          </button>
          <button type="button" className="min-h-10 rounded-lg px-2 text-sm font-semibold text-ochre" onClick={stopRest}>
            Salta
          </button>
        </div>
      </div>
    </div>
  )
}
