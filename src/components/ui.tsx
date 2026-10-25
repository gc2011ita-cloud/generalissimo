import type React from 'react'
import type { ReactNode } from 'react'
import { navigate } from '../lib/router'

export function Screen({ title, children, back }: { title: string; children?: ReactNode; back?: ReactNode }) {
  return (
    <div className="px-safe pt-safe pb-28">
      <header className="pt-4 pb-3">
        {back}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm dark:bg-ox-900 ${className}`}>{children}</section>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <p className="text-ox-700 dark:text-cream/70">{text}</p>
    </Card>
  )
}

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  className?: string
}

export function Button({ children, onClick, variant = 'secondary', disabled, className = '' }: ButtonProps) {
  const styles = {
    primary: 'bg-ox-900 text-cream dark:bg-ochre dark:text-ox-950',
    secondary: 'bg-ox-900/8 text-ox-900 dark:bg-cream/10 dark:text-cream',
    danger: 'bg-red-600 text-white',
  }[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-xl px-4 py-2 font-semibold active:opacity-70 disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function Banner({ children, tone = 'warn' }: { children: ReactNode; tone?: 'warn' | 'info' }) {
  const styles =
    tone === 'warn'
      ? 'bg-ochre/20 text-ox-900 dark:bg-ochre/15 dark:text-cream'
      : 'bg-ox-900/8 dark:bg-cream/10'
  return <div className={`rounded-2xl p-4 ${styles}`}>{children}</div>
}

const inputClass =
  'w-full rounded-xl bg-ox-900/6 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ochre dark:bg-cream/10'

/**
 * Campo con etichetta. Con `group` (gruppi di pulsanti, chip) usa un div con role=group:
 * un <label> attorno a più pulsanti darebbe il suo testo al primo pulsante e lo
 * attiverebbe toccando l'etichetta.
 */
export function Field({ label, children, hint, group = false }: { label: string; children: ReactNode; hint?: string; group?: boolean }) {
  const content = (
    <>
      <span className="mb-1 block text-sm font-medium text-ox-700 dark:text-cream/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs opacity-60">{hint}</span>}
    </>
  )
  return group ? (
    <div role="group" aria-label={label} className="block">
      {content}
    </div>
  ) : (
    <label className="block">{content}</label>
  )
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string
  onChange: (v: string) => void
}

export function TextInput({ value, onChange, className = '', ...rest }: InputProps) {
  return <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} ${className}`} />
}

/** Campo numerico con tastiera decimale (virgola su iOS). */
export function DecimalInput(props: InputProps) {
  return <TextInput inputMode="decimal" autoComplete="off" {...props} />
}

export function TextArea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className={inputClass} />
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-xl bg-ox-900/8 p-1 dark:bg-cream/10">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${
            value === v ? 'bg-white shadow-sm dark:bg-ox-700' : 'opacity-60'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Chip({
  children,
  selected,
  onClick,
}: {
  children: ReactNode
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full px-3 py-1.5 text-sm font-medium ${
        selected ? 'bg-ox-900 text-cream dark:bg-ochre dark:text-ox-950' : 'bg-ox-900/8 dark:bg-cream/10'
      }`}
    >
      {children}
    </button>
  )
}

/** Foglio dal basso, sopra la barra di navigazione. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Chiudi" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="pb-safe absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-paper px-4 pt-3 dark:bg-ox-900">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ox-900/20 dark:bg-cream/20" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-ochre-700 dark:text-ochre">
            Chiudi
          </button>
        </div>
        <div className="space-y-4 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function ListRow({
  title,
  subtitle,
  right,
  onClick,
}: {
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{title}</div>
        {subtitle && <div className="truncate text-sm opacity-65">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </>
  )
  const cls = 'flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left'
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} active:bg-ox-900/5`}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  )
}

export function List({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-ox-900/8 overflow-hidden rounded-2xl bg-white shadow-sm dark:divide-cream/10 dark:bg-ox-900">
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 pt-2">
      <h2 className="text-sm font-semibold tracking-wide text-ox-700 uppercase dark:text-cream/60">{children}</h2>
      {action}
    </div>
  )
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'pos' | 'neg' }) {
  const color = tone === 'pos' ? 'text-emerald-700 dark:text-emerald-400' : tone === 'neg' ? 'text-red-700 dark:text-red-400' : ''
  return (
    <div>
      <div className="text-xs opacity-65">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}

export function BackButton({ to, label, onClick }: { to?: string; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={() => (onClick ? onClick() : to && navigate(to))}
      className="mb-1 min-h-11 text-ochre-700 dark:text-ochre"
    >
      ‹ {label}
    </button>
  )
}
