/** Linea minima senza assi, per un andamento a colpo d'occhio (i valori sono nell'elenco). */
export function Sparkline({ values, color, height = 48 }: { values: number[]; color: string; height?: number }) {
  if (values.length < 2) return null
  const w = 300
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 8) + 4, height - 4 - ((v - min) / span) * (height - 8)])
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} aria-hidden>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill={color} />
      ))}
    </svg>
  )
}
