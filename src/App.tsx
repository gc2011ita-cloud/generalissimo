import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { TabBar } from './components/TabBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import { getSettings } from './db/settings'
import { navigate, useLocation } from './lib/router'
import { useTheme } from './lib/theme'
import { scheduleAutoSnapshots } from './modules/backup/snapshots'
import { GoalsScreen } from './modules/goals/GoalsScreen'
import { GymScreen } from './modules/gym/GymScreen'
import { MoreScreen, PlaceholderScreen } from './modules/more/MoreScreen'
import { QuickAddSheet } from './modules/quickadd/QuickAddSheet'
import { SettingsScreen } from './modules/settings/SettingsScreen'
import { TodayScreen } from './modules/today/TodayScreen'

function CurrentScreen({ path }: { path: string }) {
  switch (path) {
    case '/goals':
      return <GoalsScreen />
    case '/gym':
      return <GymScreen />
    case '/more':
      return <MoreScreen />
    case '/settings':
      return <SettingsScreen />
    case '/study':
    case '/finance':
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
    return scheduleAutoSnapshots()
  }, [])

  const isDeepLink = path === '/add'
  const closeSheet = () => {
    setSheetOpen(false)
    if (isDeepLink) navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <CurrentScreen path={path} />
      <TabBar onAdd={() => setSheetOpen(true)} />
      <QuickAddSheet open={sheetOpen || isDeepLink} tipo={isDeepLink ? query.get('tipo') : null} onClose={closeSheet} />
      <UpdatePrompt />
    </div>
  )
}
