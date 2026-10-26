import { EmptyState, Screen } from '../../components/ui'
import { navigate } from '../../lib/router'

export const MORE_SECTIONS = [
  { path: '/finance', label: 'Movimenti', empty: '' },
  { path: '/investments', label: 'Investimenti', empty: '' },
  { path: '/recurring', label: 'Spese ricorrenti', empty: '' },
  { path: '/diary', label: 'Diario', empty: '' },
  { path: '/study', label: 'Studio', empty: '' },
  { path: '/stats', label: 'Statistiche', empty: 'Statistiche e revisioni: Fase 3.' },
  { path: '/settings', label: 'Impostazioni', empty: '' },
] as const

export function MoreScreen() {
  return (
    <Screen title="Altro">
      <ul className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-ox-900">
        {MORE_SECTIONS.map((s) => (
          <li key={s.path} className="border-b border-ox-900/8 last:border-0 dark:border-cream/10">
            <button
              type="button"
              onClick={() => navigate(s.path)}
              className="flex min-h-12 w-full items-center justify-between px-4 py-3 text-left text-lg active:bg-ox-900/5"
            >
              {s.label}
              <span aria-hidden className="text-ox-900/30 dark:text-cream/30">›</span>
            </button>
          </li>
        ))}
      </ul>
    </Screen>
  )
}

export function BackLink() {
  return (
    <button type="button" onClick={() => navigate('/more')} className="mb-1 min-h-11 text-ochre-700 dark:text-ochre">
      ‹ Altro
    </button>
  )
}

export function PlaceholderScreen({ path }: { path: string }) {
  const section = MORE_SECTIONS.find((s) => s.path === path)!
  return (
    <Screen title={section.label} back={<BackLink />}>
      <EmptyState text={section.empty} />
    </Screen>
  )
}
