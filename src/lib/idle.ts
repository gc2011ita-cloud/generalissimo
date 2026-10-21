/** Attende un momento di inattività. Safari non ha requestIdleCallback: ripiego su setTimeout. */
export function whenIdle(timeout = 2000): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout })
    } else {
      setTimeout(resolve, 50)
    }
  })
}
