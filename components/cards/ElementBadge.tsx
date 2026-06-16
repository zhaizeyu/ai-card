import { elementLabels } from "@/lib/card/element"

const styles: Record<string, string> = {
  fire: "bg-ember/10 text-ember",
  water: "bg-tide/10 text-tide",
  wind: "bg-emerald-100 text-emerald-700",
  earth: "bg-moss/10 text-moss",
  light: "bg-sun/20 text-amber-800",
  dark: "bg-zinc-200 text-zinc-800",
}

export function ElementBadge({ element }: { element: string }) {
  return (
    <span className={`rounded px-2 py-1 text-xs font-semibold ${styles[element] ?? styles.dark}`}>
      {elementLabels[element as keyof typeof elementLabels] ?? element}
    </span>
  )
}
