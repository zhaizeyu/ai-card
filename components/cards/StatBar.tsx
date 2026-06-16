export function StatBar({ label, value, max = 32 }: { label: string; value: number; max?: number }) {
  const width = `${Math.min(100, Math.round((value / max) * 100))}%`

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold text-ink/70">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded bg-ink/10">
        <div className="h-2 rounded bg-ink" style={{ width }} />
      </div>
    </div>
  )
}
