import type { Card } from "@prisma/client"
import { ElementBadge } from "./ElementBadge"
import { RarityBadge } from "./RarityBadge"
import { SkillBox } from "./SkillBox"
import { StatBar } from "./StatBar"

export function MonsterCard({ card, compact = false }: { card: Card; compact?: boolean }) {
  return (
    <article className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-card">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_35%_25%,#f2b84b55,transparent_34%),linear-gradient(135deg,#f7f2e8,#d9e9e7_48%,#f3d8ca)]">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/70 bg-white/55 text-5xl shadow-card backdrop-blur">
          {card.name.slice(0, 1)}
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold leading-tight">{card.name}</h2>
            <p className="mt-1 text-sm text-ink/60">{card.race ?? "未知种族"}</p>
          </div>
          <div className="flex gap-2">
            <RarityBadge rarity={card.rarity} />
            <ElementBadge element={card.element} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBar label="HP" value={card.hp} max={60} />
          <StatBar label="ATK" value={card.atk} />
          <StatBar label="DEF" value={card.def} />
          <StatBar label="SPD" value={card.spd} />
        </div>

        {!compact && (
          <>
            <SkillBox card={card} />
            <p className="text-sm leading-6 text-ink/70">{card.description}</p>
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-ink/60">
              <span>Lv.{card.level}</span>
              <span>EXP {card.exp}</span>
              <span>{card.wins} 胜</span>
              <span>{card.losses} 负</span>
              <span>Power {card.powerScore}</span>
            </div>
          </>
        )}
      </div>
    </article>
  )
}
