import type { ReactNode } from 'react'

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
