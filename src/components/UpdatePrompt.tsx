import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui'

/** Avviso quando è pronta una nuova versione dell'app (service worker in attesa). */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // L'app installata resta aperta a lungo: controlla gli aggiornamenti ogni ora.
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })
  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-3 bottom-24 z-40 flex items-center justify-between gap-3 rounded-2xl bg-ox-900 p-3 text-cream shadow-lg">
      <span className="text-sm">Nuova versione disponibile</span>
      <div className="flex gap-2">
        <Button className="bg-cream/10! text-cream!" onClick={() => setNeedRefresh(false)}>
          Dopo
        </Button>
        <Button className="bg-ochre! text-ox-950!" onClick={() => updateServiceWorker(true)}>
          Aggiorna
        </Button>
      </div>
    </div>
  )
}
