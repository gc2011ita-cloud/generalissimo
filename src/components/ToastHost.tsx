import { dismissToast, useToast } from '../lib/toast'

export function ToastHost() {
  const toast = useToast()
  if (!toast) return null
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl bg-ox-900 px-4 py-3 text-cream shadow-lg"
    >
      <span className="text-sm">{toast.message}</span>
      {toast.undo && (
        <button
          type="button"
          className="min-h-10 px-2 font-semibold text-ochre"
          onClick={async () => {
            dismissToast()
            await toast.undo?.()
          }}
        >
          Annulla
        </button>
      )}
    </div>
  )
}
