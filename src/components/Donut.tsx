import type { ReactNode } from 'react'

// Grafico ad anello in SVG: segmenti con 2 px di stacco, tocco per selezionare.

export interface DonutSegment {
  id: string
  value: number
  color: string
  label: string
}

export function Donut({
  segments,
  center,
  selectedId,
  onSelect,
  size = 240,
  thickness = 34,
}: {
  segments: DonutSegment[]
  center: ReactNode
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  size?: number
  thickness?: number
}) {
  const r = (size - thickness) / 2 - 4
  const c = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + x.value, 0)
  const gap = segments.length > 1 ? 2 : 0
  let offset = 0

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90" role="img" aria-label="Ripartizione per categoria">
        {total === 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-ox-900/10 dark:stroke-cream/10" />
        )}
        {segments.map((s) => {
          const len = (s.value / total) * c
          const dash = Math.max(len - gap, 0.5)
          const el = (
            <circle
              key={s.id}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={selectedId === s.id ? thickness + 8 : thickness}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              opacity={selectedId && selectedId !== s.id ? 0.35 : 1}
              onClick={() => onSelect?.(selectedId === s.id ? null : s.id)}
              className="cursor-pointer transition-all duration-200"
            >
              <title>{s.label}</title>
            </circle>
          )
          offset += len
          return el
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>
    </div>
  )
}
