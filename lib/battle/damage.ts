import type { Card } from "@prisma/client"
import { getElementMultiplier, type Element } from "@/lib/card/element"

export const skillMultiplier: Record<string, number> = {
  normal_attack: 1,
  damage: 1.2,
  burn: 0.9,
  armor_break: 0.8,
  lifesteal: 0.9,
  stun: 0.6,
  chain: 0.65,
  pierce: 1,
  execute: 0.75,
  poison: 0.75,
  mark: 0.7,
}

export function calculateDamage(attacker: Card, defender: Card, skillType = "normal_attack", defModifier = 0): number {
  const variance = Math.floor(Math.random() * 4) - 1
  const multiplier = skillMultiplier[skillType] ?? 1
  const base = Math.max(1, attacker.atk * multiplier - Math.max(0, defender.def + defModifier) * 0.5 + variance)
  return Math.max(1, Math.floor(base * getElementMultiplier(attacker.element as Element, defender.element as Element)))
}
