import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useEffect, useState } from 'react'
import { TabBar } from './components/TabBar'
import { ToastHost } from './components/ToastHost'
import { UpdatePrompt } from './components/UpdatePrompt'
import { ensureSeedData } from './db/seed'
import { getSettings } from './db/settings'
import { navigate, useLocation } from './lib/router'
import { useTheme } from './lib/theme'
import { scheduleAutoSnapshots } from './modules/backup/snapshots'
import { CheckInScreen } from './modules/diary/CheckInScreen'
import { FinanceScreen } from './modules/finance/FinanceScreen'
import { GoalsScreen } from './modules/goals/GoalsScreen'
import { GymScreen } from './modules/gym/GymScreen'
import { RestTimerBar } from './modules/gym/RestTimerBar'
import { SessionScreen } from './modules/gym/SessionScreen'
import { TemplatesScreen } from './modules/gym/TemplatesScreen'
import { LockGate } from './modules/lock/LockGate'
import { MoreScreen, PlaceholderScreen } from './modules/more/MoreScreen'
import { QuickAddSheet } from './modules/quickadd/QuickAddSheet'
import { SettingsScreen } from './modules/settings/SettingsScreen'
import { TodayScreen } from './modules/today/TodayScreen'

// Schermate con grafici (Recharts) caricate a parte: l'avvio resta leggero.
const FinanceStatsScreen = lazy(() => import('./modules/finance/FinanceStatsScreen').then((m) => ({ default: m.FinanceStatsScreen })))
const DiaryScreen = lazy(() => import('./modules/diary/DiaryScreen').then((m) => ({ default: m.DiaryScreen })))
const BodyScreen = lazy(() => import('./modules/gym/BodyScreen').then((m) => ({ default: m.BodyScreen })))
const ExercisesScreen = lazy(() => import('./modules/gym/ExercisesScreen').then((m) => ({ default: m.ExercisesScreen })))
const ExerciseDetailScreen = lazy(() => import('./modules/gym/ExercisesScreen').then((m) => ({ default: m.ExerciseDetailScreen })))

function CurrentScreen({ path, query }: { path: string; query: URLSearchParams }) {
  switch (path) {
    case '/goals':
      return <GoalsScreen />
    case '/gym':
      return <GymScreen />
    case '/gym/session':
      return <SessionScreen key={query.get('id')} />
    case '/gym/templates':
      return <TemplatesScreen />
    case '/gym/exercises':
      return <ExercisesScreen />
    case '/gym/exercise':
      return <ExerciseDetailScreen key={query.get('id')} />
    case '/gym/body':
      return <BodyScreen />
    case '/checkin':
      return <CheckInScreen key={query.get('date') ?? 'oggi'} />
    case '/diary':
      return <DiaryScreen />
    case '/finance':
      return <FinanceScreen />
    case '/finance/stats':
      return <FinanceStatsScreen />
    case '/more':
      return <MoreScreen />
    case '/settings':
      return <SettingsScreen />
    case '/study':
    case '/stats':
      return <PlaceholderScreen path={path} />
    default:
      // '/' e '/add' (link profondo: Oggi sotto il foglio "+")
      return <TodayScreen />
  }
}

export default function App() {
  const { path, query } = useLocation()
  const settings = useLiveQuery(() => getSettings())
  const [sheetOpen, setSheetOpen] = useState(false)
  useTheme(settings?.theme ?? 'system')

  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {})
    ensureSeedData().catch((e) => console.error('Dati di partenza non creati', e))
    return scheduleAutoSnapshots()
  }, [])

  useEffect(() => window.scrollTo(0, 0), [path])

  const isDeepLink = path === '/add'
  const closeSheet = () => {
    setSheetOpen(false)
    if (isDeepLink) navigate('/', { replace: true })
  }

  return (
    <LockGate>
      <div className="mx-auto min-h-dvh max-w-lg">
        <Suspense fallback={null}>
          <CurrentScreen path={path} query={query} />
        </Suspense>
        <TabBar onAdd={() => setSheetOpen(true)} />
        <QuickAddSheet open={sheetOpen || isDeepLink} tipo={isDeepLink ? query.get('tipo') : null} onClose={closeSheet} />
        <RestTimerBar />
        <ToastHost />
        <UpdatePrompt />
      </div>
    </LockGate>
  )
}
