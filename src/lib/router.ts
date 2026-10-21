// Router minimo su History API. Supporta i link profondi (es. /add?tipo=spesa).

import { useSyncExternalStore } from 'react'

const NAV_EVENT = 'app:navigate'

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback)
  window.addEventListener(NAV_EVENT, callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener(NAV_EVENT, callback)
  }
}

const getHref = () => window.location.pathname + window.location.search

export function navigate(to: string, { replace = false } = {}) {
  if (to === getHref()) return
  if (replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  window.dispatchEvent(new Event(NAV_EVENT))
}

export function useLocation() {
  const href = useSyncExternalStore(subscribe, getHref)
  const url = new URL(href, window.location.origin)
  return { path: url.pathname, query: url.searchParams }
}
