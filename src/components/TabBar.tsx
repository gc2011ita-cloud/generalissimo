import type { ReactNode } from 'react'
import { navigate, useLocation } from '../lib/router'

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
)

const TABS: { path: string; label: string; icon: ReactNode; match: (p: string) => boolean }[] = [
  { path: '/', label: 'Oggi', icon: icon('M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'), match: (p) => p === '/' || p.startsWith('/checkin') },
  { path: '/goals', label: 'Obiettivi', icon: icon('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'), match: (p) => p.startsWith('/goals') },
  { path: '/gym', label: 'Palestra', icon: icon('M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12'), match: (p) => p.startsWith('/gym') },
  { path: '/more', label: 'Altro', icon: icon('M5 12h.01M12 12h.01M19 12h.01'), match: (p) => !['/', '/add'].includes(p) && !p.startsWith('/checkin') && !p.startsWith('/goals') && !p.startsWith('/gym') },
]

export function TabBar({ onAdd }: { onAdd: () => void }) {
  const { path } = useLocation()
  const tab = (t: (typeof TABS)[number]) => {
    const active = t.match(path)
    return (
      <button
        key={t.path}
        type="button"
        onClick={() => navigate(t.path)}
        aria-current={active ? 'page' : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 pt-2 text-[11px] font-medium ${
          active ? 'text-ox-900 dark:text-ochre' : 'text-ox-900/45 dark:text-cream/45'
        }`}
      >
        {t.icon}
        {t.label}
      </button>
    )
  }

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-ox-900/10 bg-paper/90 backdrop-blur dark:border-cream/10 dark:bg-ox-950/90">
      <div className="mx-auto flex max-w-lg items-start pb-1">
        {tab(TABS[0])}
        {tab(TABS[1])}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Aggiungi"
            className="-mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-ox-900 text-cream shadow-lg active:scale-95 dark:bg-ochre dark:text-ox-950"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
        {tab(TABS[2])}
        {tab(TABS[3])}
      </div>
    </nav>
  )
}
