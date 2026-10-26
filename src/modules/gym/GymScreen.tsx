import { List, ListRow, Screen } from '../../components/ui'
import { navigate } from '../../lib/router'
import { SportCard } from '../sport/SportCard'
import { RecordsCard } from './RecordsCard'

export function GymScreen() {
  return (
    <Screen title="Sport">
      <SportCard />
      <RecordsCard />
      <List>
        <ListRow title="Allenamenti con scheda" subtitle="Sessioni, timer di recupero, attività all'aperto, progressi" right="›" onClick={() => navigate('/gym/sessions')} />
      </List>
    </Screen>
  )
}
