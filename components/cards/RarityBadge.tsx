import { rarityLabels } from "@/lib/card/rarity"

const styles: Record<string, string> = {
  common: "bg-zinc-100 text-zinc-700",
  rare: "bg-tide/10 text-tide",
  epic: "bg-purple-100 text-purple-700",
  legendary: "bg-sun/20 text-amber-800",
}

export function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <span className={`rounded px-2 py-1 text-xs font-semibold ${styles[rarity] ?? styles.common}`}>
      {rarityLabels[rarity as keyof typeof rarityLabels] ?? rarity}
    </span>
  )
}
