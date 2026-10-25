// Timer di recupero condiviso tra le schermate (parte dopo ogni serie).

import { useEffect, useState, useSyncExternalStore } from 'react'

let endsAt: number | null = null
let total = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
let audio: AudioContext | null = null

/** Va chiamata dentro un tocco: iOS permette l'audio solo dopo un gesto. */
export function primeAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

function beep() {
  if (!audio) return
  const o = audio.createOscillator()
  const g = audio.createGain()
  o.frequency.value = 880
  g.gain.setValueAtTime(0.2, audio.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6)
  o.connect(g).connect(audio.destination)
  o.start()
  o.stop(audio.currentTime + 0.6)
}

let tick: ReturnType<typeof setInterval> | undefined

export function startRest(seconds: number) {
  total = seconds
  endsAt = Date.now() + seconds * 1000
  clearInterval(tick)
  tick = setInterval(() => {
    if (endsAt !== null && Date.now() >= endsAt) {
      beep()
      stopRest()
    }
  }, 500)
  emit()
}

export function adjustRest(delta: number) {
  if (endsAt === null) return
  endsAt += delta * 1000
  total += delta
  emit()
}

export function stopRest() {
  endsAt = null
  clearInterval(tick)
  emit()
}

export function useRestTimer() {
  const end = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => endsAt,
  )
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (end === null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [end])
  if (end === null) return null
  return { remaining: Math.max(0, Math.ceil((end - now) / 1000)), total }
}
